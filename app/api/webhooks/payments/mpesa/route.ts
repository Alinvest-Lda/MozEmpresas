import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyMpesaWebhookSignature, classifyMpesaCallbackAuditError } from "@/lib/payments/mpesa-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  transactionId: z.string().trim().min(3).max(160),
  paymentReference: z.string().trim().min(4).max(100),
  amount: z.number().positive().finite(),
  currency: z.literal("MZN"),
  merchantCode: z.string().trim().min(2).max(80),
  status: z.enum(["SUCCESS", "PENDING", "FAILED", "CANCELLED"]),
}).strict();

const MAX_BODY_BYTES = 8_192;

export async function POST(request: Request) {
  const secret = process.env.MPESA_WEBHOOK_SECRET;
  const merchantCode = process.env.MPESA_MERCHANT_CODE;
  if (!secret || !merchantCode) {
    return NextResponse.json({ error: "O canal de pagamento ainda não está configurado." }, { status: 503 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Evento demasiado grande." }, { status: 413 });
  }

  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Evento vazio." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return NextResponse.json({ error: "Evento demasiado grande." }, { status: 413 });
    }
    chunks.push(value);
  }
  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let rawBody: string;
  try {
    rawBody = new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes);
  } catch {
    return NextResponse.json({ error: "Codificação do evento inválida." }, { status: 400 });
  }

  const timestamp = request.headers.get("x-mpesa-timestamp");
  const signature = request.headers.get("x-mpesa-signature");
  if (!verifyMpesaWebhookSignature({ rawBody, timestamp, signature, secret })) {
    return NextResponse.json({ error: "Assinatura inválida ou expirada." }, { status: 401 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Formato de confirmação M-Pesa inválido." }, { status: 400 });
  }
  const payment = parsed.data;

  if (payment.merchantCode !== merchantCode) {
    return NextResponse.json({ error: "O pagamento não pertence à conta comercial configurada." }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const receivedAt = new Date().toISOString();
  const { data: callbackEvent, error: auditError } = await supabase.rpc("record_credit_payment_callback", {
    p_provider_transaction_id: payment.transactionId,
    p_payment_reference: payment.paymentReference,
    p_amount_mzn: payment.amount,
    p_currency: payment.currency,
    p_merchant_code: payment.merchantCode,
    p_callback_status: payment.status,
    p_received_at: receivedAt,
  });

  if (auditError || !callbackEvent?.id) {
    const auditCode = classifyMpesaCallbackAuditError(auditError?.message || "");
    if (auditCode === "CALLBACK_TRANSACTION_CONFLICT") {
      return NextResponse.json({ error: "O identificador da transacção já foi usado com dados de pagamento diferentes." }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível registar o evento de pagamento." }, { status: 503 });
  }

  // Service orders use a separate settlement RPC; they must never be routed through credit top-ups.
  if (payment.status === "SUCCESS" && payment.paymentReference.startsWith("SERVICE:")) {
    const { data, error } = await supabase.rpc("confirm_mpesa_platform_service_payment", {
      p_payment_reference: payment.paymentReference,
      p_provider_transaction_id: payment.transactionId,
      p_amount_mzn: payment.amount,
      p_currency: payment.currency,
    });
    if (error) {
      const known = error.message.includes("SERVICE_PAYMENT_NOT_FOUND")
        || error.message.includes("SERVICE_ORDER_NOT_FOUND")
        || error.message.includes("PAYMENT_AMOUNT_MISMATCH")
        || error.message.includes("SERVICE_ORDER_NOT_PAYABLE")
        || error.message.includes("SERVICE_PAYMENT_ALREADY_SETTLED")
        || error.message.includes("PROVIDER_TRANSACTION_ALREADY_USED");
      await supabase.from("credit_payment_callback_events").update({
        processing_status: known ? "REJECTED" : "RETRY",
        processing_error_code: known
          ? error.message.match(/SERVICE_PAYMENT_NOT_FOUND|SERVICE_ORDER_NOT_FOUND|PAYMENT_AMOUNT_MISMATCH|SERVICE_ORDER_NOT_PAYABLE|SERVICE_PAYMENT_ALREADY_SETTLED|PROVIDER_TRANSACTION_ALREADY_USED/)?.[0] || "SERVICE_PAYMENT_REJECTED"
          : "SERVICE_CONFIRMATION_UNAVAILABLE",
        processed_at: known ? new Date().toISOString() : null,
      }).eq("id", callbackEvent.id);
      return NextResponse.json(
        { error: known ? "A confirmação não corresponde a uma contratação válida." : "Não foi possível reconciliar a contratação." },
        { status: known ? 409 : 503 },
      );
    }

    const processedAt = new Date().toISOString();
    const { error: auditUpdateError } = await supabase
      .from("credit_payment_callback_events")
      .update({
        processing_status: "PROCESSED",
        processing_error_code: null,
        processed_at: processedAt,
      })
      .eq("id", callbackEvent.id);
    if (auditUpdateError) {
      return NextResponse.json({ error: "Pagamento confirmado; a actualização do registo de auditoria será repetida." }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      serviceOrderId: data?.order_id,
      alreadyProcessed: Boolean(data?.already_processed),
    });
  }

  if (
    payment.paymentReference.startsWith("SERVICE:") &&
    (payment.status === "FAILED" || payment.status === "CANCELLED")
  ) {
    const { data, error } = await supabase.rpc("record_mpesa_platform_service_failure", {
      p_payment_reference: payment.paymentReference,
      p_provider_transaction_id: payment.transactionId,
      p_amount_mzn: payment.amount,
      p_currency: payment.currency,
      p_callback_status: payment.status,
    });
    if (error) {
      const known = error.message.includes("SERVICE_PAYMENT_NOT_FOUND")
        || error.message.includes("SERVICE_ORDER_NOT_FOUND")
        || error.message.includes("PAYMENT_AMOUNT_MISMATCH");
      await supabase.from("credit_payment_callback_events").update({
        processing_status: known ? "REJECTED" : "RETRY",
        processing_error_code: known ? "SERVICE_FAILURE_CALLBACK_REJECTED" : "SERVICE_FAILURE_CALLBACK_UNAVAILABLE",
        processed_at: known ? new Date().toISOString() : null,
      }).eq("id", callbackEvent.id);
      return NextResponse.json({ error: "Não foi possível reconciliar o estado da contratação." }, { status: known ? 409 : 503 });
    }
    const { error: auditError } = await supabase.from("credit_payment_callback_events").update({
      processing_status: "PROCESSED",
      processing_error_code: null,
      processed_at: new Date().toISOString(),
    }).eq("id", callbackEvent.id);
    if (auditError) return NextResponse.json({ error: "Estado actualizado; auditoria será repetida." }, { status: 503 });
    return NextResponse.json({ ok: true, serviceOrderId: data?.order_id, ignored: Boolean(data?.ignored) }, { status: 202 });
  }

  // Partner advertising has its own settlement lifecycle; never route it through credit top-ups.
  if (payment.paymentReference.startsWith("PARTNER_AD:")) {
    if (payment.status === "SUCCESS") {
      const { data, error } = await supabase.rpc("confirm_mpesa_partner_ad_payment", {
        p_payment_reference: payment.paymentReference,
        p_provider_transaction_id: payment.transactionId,
        p_amount_mzn: payment.amount,
        p_currency: payment.currency,
      });
      if (error) {
        const known = [
          "PARTNER_AD_PAYMENT_NOT_FOUND", "PARTNER_AD_ORDER_NOT_FOUND",
          "PAYMENT_AMOUNT_MISMATCH", "PARTNER_AD_PAYMENT_NOT_PAYABLE",
          "PARTNER_AD_PAYMENT_ALREADY_SETTLED", "PROVIDER_TRANSACTION_ALREADY_USED",
        ].find((code) => error.message.includes(code));
        await supabase.from("credit_payment_callback_events").update({
          processing_status: known ? "REJECTED" : "RETRY",
          processing_error_code: known || "PARTNER_AD_CONFIRMATION_UNAVAILABLE",
          processed_at: known ? new Date().toISOString() : null,
        }).eq("id", callbackEvent.id);
        return NextResponse.json(
          { error: known ? "A confirmação não corresponde a uma campanha válida." : "Não foi possível reconciliar a campanha." },
          { status: known ? 409 : 503 },
        );
      }
      const { error: auditUpdateError } = await supabase.from("credit_payment_callback_events").update({
        processing_status: "PROCESSED",
        processing_error_code: null,
        processed_at: new Date().toISOString(),
      }).eq("id", callbackEvent.id);
      if (auditUpdateError) return NextResponse.json({ error: "Pagamento confirmado; auditoria será repetida." }, { status: 503 });
      return NextResponse.json({ ok: true, partnerAdOrderId: data?.order_id, alreadyProcessed: Boolean(data?.already_processed) });
    }

    if (payment.status === "FAILED" || payment.status === "CANCELLED") {
      const { data, error } = await supabase.rpc("fail_mpesa_partner_ad_payment", {
        p_payment_reference: payment.paymentReference,
        p_provider_transaction_id: payment.transactionId,
        p_amount_mzn: payment.amount,
        p_currency: payment.currency,
      });
      if (error) {
        const known = ["PARTNER_AD_PAYMENT_NOT_FOUND", "PARTNER_AD_ORDER_NOT_FOUND", "PAYMENT_AMOUNT_MISMATCH"]
          .find((code) => error.message.includes(code));
        await supabase.from("credit_payment_callback_events").update({
          processing_status: known ? "REJECTED" : "RETRY",
          processing_error_code: known || "PARTNER_AD_FAILURE_UNAVAILABLE",
          processed_at: known ? new Date().toISOString() : null,
        }).eq("id", callbackEvent.id);
        return NextResponse.json({ error: "Não foi possível reconciliar o estado da campanha." }, { status: known ? 409 : 503 });
      }
      const { error: auditUpdateError } = await supabase.from("credit_payment_callback_events").update({
        processing_status: "PROCESSED",
        processing_error_code: null,
        processed_at: new Date().toISOString(),
      }).eq("id", callbackEvent.id);
      if (auditUpdateError) return NextResponse.json({ error: "Estado actualizado; auditoria será repetida." }, { status: 503 });
      return NextResponse.json({ ok: true, partnerAdOrderId: data?.order_id, ignored: Boolean(data?.ignored) }, { status: 202 });
    }
  }

  // Non-success callbacks are recorded for audit but can never credit a wallet.
  if (payment.status !== "SUCCESS") {
    const { error: updateError } = await supabase
      .from("credit_payment_callback_events")
      .update({ processing_status: "IGNORED", processed_at: receivedAt })
      .eq("id", callbackEvent.id);
    if (updateError) {
      return NextResponse.json({ error: "Não foi possível concluir o registo do evento." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, credited: false, paymentStatus: payment.status }, { status: 202 });
  }

  try {
    const { data, error } = await supabase.rpc("confirm_mpesa_credit_purchase", {
      p_payment_reference: payment.paymentReference,
      p_provider_transaction_id: payment.transactionId,
      p_amount_mzn: payment.amount,
      p_currency: payment.currency,
      p_payload: {
        merchant_code: payment.merchantCode,
        callback_status: payment.status,
        received_at: receivedAt,
      },
    });

    if (error) {
      const known = error.message.includes("PAYMENT_REFERENCE_NOT_FOUND")
        || error.message.includes("PAYMENT_AMOUNT_MISMATCH")
        || error.message.includes("PURCHASE_NOT_PAYABLE")
        || error.message.includes("PROVIDER_TRANSACTION_ALREADY_USED");
      await supabase.from("credit_payment_callback_events").update({
        processing_status: known ? "REJECTED" : "RETRY",
        processing_error_code: known
          ? error.message.match(/PAYMENT_REFERENCE_NOT_FOUND|PAYMENT_AMOUNT_MISMATCH|PURCHASE_NOT_PAYABLE|PROVIDER_TRANSACTION_ALREADY_USED/)?.[0] || "PAYMENT_REJECTED"
          : "CONFIRMATION_UNAVAILABLE",
        processed_at: known ? new Date().toISOString() : null,
      }).eq("id", callbackEvent.id);
      return NextResponse.json(
        { error: known ? "A confirmação não corresponde a um pedido válido." : "Não foi possível reconciliar o pagamento." },
        { status: known ? 409 : 503 },
      );
    }

    const processedAt = new Date().toISOString();
    const { error: auditUpdateError } = await supabase
      .from("credit_payment_callback_events")
      .update({
        request_id: data?.request_id ?? null,
        processing_status: "PROCESSED",
        processing_error_code: null,
        processed_at: processedAt,
      })
      .eq("id", callbackEvent.id);

    if (auditUpdateError) {
      // The wallet confirmation is already committed. A retry remains safe because the RPC is idempotent.
      return NextResponse.json({ error: "Pagamento confirmado; a actualização do registo de auditoria será repetida." }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      credited: !data?.already_processed,
      alreadyProcessed: Boolean(data?.already_processed),
      requestId: data?.request_id,
    });
  } catch {
    await supabase.from("credit_payment_callback_events").update({
      processing_status: "RETRY",
      processing_error_code: "CONFIRMATION_UNAVAILABLE",
    }).eq("id", callbackEvent.id);
    return NextResponse.json({ error: "Serviço de confirmação temporariamente indisponível." }, { status: 503 });
  }
}

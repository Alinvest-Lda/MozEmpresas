import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyMpesaWebhookSignature } from "@/lib/payments/mpesa-webhook";

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

  // Pending/failed callbacks are acknowledged but never credit a wallet.
  if (payment.status !== "SUCCESS") {
    return NextResponse.json({ ok: true, credited: false, paymentStatus: payment.status }, { status: 202 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("confirm_mpesa_credit_purchase", {
      p_payment_reference: payment.paymentReference,
      p_provider_transaction_id: payment.transactionId,
      p_amount_mzn: payment.amount,
      p_currency: payment.currency,
      p_payload: {
        merchant_code: payment.merchantCode,
        callback_status: payment.status,
        received_at: new Date().toISOString(),
      },
    });

    if (error) {
      const known = error.message.includes("PAYMENT_REFERENCE_NOT_FOUND")
        || error.message.includes("PAYMENT_AMOUNT_MISMATCH")
        || error.message.includes("PURCHASE_NOT_PAYABLE")
        || error.message.includes("PROVIDER_TRANSACTION_ALREADY_USED");
      return NextResponse.json(
        { error: known ? "A confirmação não corresponde a um pedido válido." : "Não foi possível reconciliar o pagamento." },
        { status: known ? 409 : 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      credited: !data?.already_processed,
      alreadyProcessed: Boolean(data?.already_processed),
      requestId: data?.request_id,
    });
  } catch {
    return NextResponse.json({ error: "Serviço de confirmação temporariamente indisponível." }, { status: 503 });
  }
}

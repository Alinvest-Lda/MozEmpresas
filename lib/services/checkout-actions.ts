"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { randomBytes } from "node:crypto";
import { createMpesaClient, getMpesaConfigFromEnv } from "@/lib/payments/mpesa-client";
import type { SupabaseClient } from "@supabase/supabase-js";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

async function access(s: SupabaseClient, uid: string, bid: string) {
  const { data: owner } = await s.from("businesses").select("id").eq("id", bid).eq("owner_id", uid).maybeSingle();
  if (owner) return true;
  const { data: member } = await s.from("business_members").select("role").eq("business_id", bid).eq("user_id", uid).in("role", ["owner", "admin", "operator"]).maybeSingle();
  return !!member;
}

export async function purchasePlatformService(formData: FormData) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");

  const serviceId = text(formData.get("serviceId"));
  const businessId = text(formData.get("businessId"));
  const method = text(formData.get("paymentMethod")) || "CREDITS";
  const purchaseKey = text(formData.get("purchaseKey"));
  if ((method === "CREDITS" || method === "MPESA") && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(purchaseKey)) {
    return { error: "Actualize a página e tente novamente." };
  }

  if (!serviceId || !businessId || !(await access(s, user.id, businessId))) {
    return { error: "Não tem autorização para esta contratação." };
  }

  const { data: service } = await s
    .from("platform_services")
    .select("id,name,price,currency,billing,default_term_days")
    .eq("id", serviceId)
    .eq("active", true)
    .maybeSingle();

  if (!service || service.price == null || Number(service.price) <= 0) {
    return { error: "Este serviço ainda não está disponível para contratação self-service." };
  }

  if (method === "CREDITS") {
    const { data, error } = await s.rpc("purchase_platform_service_with_credits", {
      p_service_id: serviceId,
      p_business_id: businessId,
      p_user_id: user.id,
      p_idempotency_key: purchaseKey,
    });

    if (error) {
      return {
        error: error.message.includes("INSUFFICIENT_CREDITS")
          ? "Créditos insuficientes."
          : error.message.includes("NO_WALLET")
            ? "Esta empresa ainda não tem carteira de créditos."
            : "Não foi possível concluir a contratação.",
      };
    }

    revalidatePath("/dashboard/servicos");
    revalidatePath("/dashboard/financeiro");
    revalidatePath("/dashboard/monetizacao/creditos");
    return { success: true, orderId: String(data) };
  }

  if (method !== "MPESA") return { error: "Meio de pagamento não suportado." };

  const customerMsisdn = text(formData.get("customerMsisdn"));
  if (!/^2588[2-9][0-9]{7}$/.test(customerMsisdn)) {
    return { error: "Introduza um número M-Pesa moçambicano válido no formato 258XXXXXXXXX." };
  }

  let mpesaConfig: ReturnType<typeof getMpesaConfigFromEnv>;
  let privileged: ReturnType<typeof createServiceRoleClient>;
  try {
    mpesaConfig = getMpesaConfigFromEnv();
    privileged = createServiceRoleClient();
  } catch {
    return { error: "O ambiente M-Pesa Sandbox ainda não está totalmente configurado. Contacte o suporte." };
  }

  const { error: profileUpdateError } = await s
    .from("user_payment_settings")
    .upsert({ user_id: user.id, mpesa_msisdn: customerMsisdn }, { onConflict: "user_id" });
  if (profileUpdateError) {
    return { error: "Não foi possível guardar o número M-Pesa na sua conta." };
  }

  const { data: pendingOrder, error: pendingOrderError } = await s.rpc("create_mpesa_platform_service_order", {
    p_service_id: serviceId,
    p_business_id: businessId,
    p_user_id: user.id,
    p_idempotency_key: purchaseKey,
  });
  if (pendingOrderError || !pendingOrder?.order_id || !pendingOrder?.payment_id || !pendingOrder?.reference) {
    return { error: pendingOrderError?.message.includes("FORBIDDEN")
      ? "Não tem autorização para esta contratação."
      : "Não foi possível registar a contratação M-Pesa." };
  }

  const orderId = String(pendingOrder.order_id);
  // Never issue a second charge for an idempotency key already registered.
  if (pendingOrder.already_exists) {
    revalidatePath("/dashboard/financeiro");
    return { success: true, orderId, pending: true };
  }

  const thirdPartyReference = "ME" + randomBytes(9).toString("hex");
  const transactionReference = "SVC" + orderId.replace(/-/g, "").slice(-17);

  const { data: payment, error: paymentUpdateError } = await privileged
    .from("financial_payments")
    .update({
      mpesa_customer_msisdn: customerMsisdn,
      mpesa_third_party_reference: thirdPartyReference,
      mpesa_requested_at: new Date().toISOString(),
      mpesa_response_code: "REQUESTING",
    })
    .eq("id", String(pendingOrder.payment_id))
    .eq("user_id", user.id)
    .eq("reference", String(pendingOrder.reference))
    .eq("method", "MPESA")
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();

  if (paymentUpdateError || !payment) {
    return { error: "Não foi possível preparar o pedido M-Pesa. Contacte o suporte antes de tentar novamente." };
  }

  try {
    const response = await createMpesaClient(mpesaConfig).initiateC2B({
      transactionReference,
      customerMsisdn,
      amount: Number(service.price).toFixed(2),
      thirdPartyReference,
      serviceProviderCode: mpesaConfig.serviceProviderCode,
    });

    const { error: responseUpdateError } = await privileged
      .from("financial_payments")
      .update({
        mpesa_conversation_id: response.output_ConversationID || null,
        mpesa_response_code: response.output_ResponseCode || "RESPONSE_RECEIVED",
        mpesa_response_desc: response.output_ResponseDesc || null,
      })
      .eq("id", payment.id);

    if (responseUpdateError) {
      // The request may have reached Vodacom. Do not retry or mark as paid.
      return { success: true, orderId, pending: true };
    }
  } catch {
    // A timeout/network failure is ambiguous: the provider may have received it.
    // Keep the order pending and require a status reconciliation before any retry.
    await privileged.from("financial_payments")
      .update({ mpesa_response_code: "OUTCOME_UNKNOWN", mpesa_response_desc: "A resposta do pedido não foi recebida; reconciliação necessária." })
      .eq("id", payment.id);
    return { success: true, orderId, pending: true };
  }

  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/financeiro");
  return { success: true, orderId, pending: true };
}

export async function reconcileMpesaServicePayment(formData: FormData) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");

  const paymentId = text(formData.get("paymentId"));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) {
    redirect("/dashboard/financeiro");
  }

  // RLS first establishes that the signed-in user can see this payment.
  const { data: visiblePayment } = await s
    .from("financial_payments")
    .select("id,business_id,reference,method,status,mpesa_third_party_reference,mpesa_conversation_id")
    .eq("id", paymentId)
    .eq("method", "MPESA")
    .maybeSingle();

  if (!visiblePayment || !visiblePayment.business_id
      || !visiblePayment.reference?.startsWith("SERVICE:")
      || !(await access(s, user.id, visiblePayment.business_id))) {
    redirect("/dashboard/financeiro");
  }
  if (visiblePayment.status !== "PENDING" || !visiblePayment.mpesa_third_party_reference) {
    revalidatePath("/dashboard/financeiro");
    redirect("/dashboard/financeiro");
  }

  let config: ReturnType<typeof getMpesaConfigFromEnv>;
  let privileged: ReturnType<typeof createServiceRoleClient>;
  try {
    config = getMpesaConfigFromEnv();
    privileged = createServiceRoleClient();
  } catch {
    redirect("/dashboard/financeiro");
  }

  const queryReference = visiblePayment.mpesa_conversation_id || visiblePayment.mpesa_third_party_reference;
  try {
    const response = await createMpesaClient(config).queryTransactionStatus({
      thirdPartyReference: visiblePayment.mpesa_third_party_reference,
      queryReference,
      serviceProviderCode: config.serviceProviderCode,
    });

    const returnedReference = response.output_ThirdPartyReference?.trim();
    if (returnedReference && returnedReference !== visiblePayment.mpesa_third_party_reference) {
      redirect("/dashboard/financeiro");
    }
    const transactionStatus = response.output_ResponseTransactionStatus;
    if (!transactionStatus || !["Completed", "Cancelled", "Expired", "N/A"].includes(transactionStatus)) {
      redirect("/dashboard/financeiro");
    }

    const { error } = await privileged.rpc("record_mpesa_platform_service_status", {
      p_payment_reference: visiblePayment.reference,
      p_third_party_reference: visiblePayment.mpesa_third_party_reference,
      p_conversation_id: response.output_ConversationID || visiblePayment.mpesa_conversation_id || null,
      p_transaction_status: transactionStatus,
      p_response_code: response.output_ResponseCode || "UNKNOWN",
      p_response_desc: response.output_ResponseDesc || "Consulta de estado recebida sem descrição do fornecedor.",
      p_checked_at: new Date().toISOString(),
    });
    if (error) {
      // Do not expose provider payloads or database errors to the browser.
      redirect("/dashboard/financeiro");
    }
  } catch {
    // A status lookup is read-only; the payment remains pending on lookup failure.
  }

  revalidatePath("/dashboard/financeiro");
  redirect("/dashboard/financeiro");
}

export async function adminCancelPlatformServiceOrder(formData: FormData): Promise<void> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const orderId = text(formData.get("orderId"));
  const reason = text(formData.get("reason"));
  const refundReference = text(formData.get("refundReference")) || null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId) || reason.length < 8 || reason.length > 1000) {
    redirect("/dashboard/admin/monetizacao/servicos?resultado=invalid");
  }
  const { error } = await s.rpc("admin_cancel_platform_service_order", {
    p_order_id: orderId,
    p_reason: reason,
    p_external_refund_reference: refundReference,
  });
  if (error) {
    const known = ["FORBIDDEN","COMPLETED_ORDER_NOT_REVERSIBLE","ORDER_ALREADY_CANCELLED","FAILED_ORDER_NOT_CANCELLABLE","EXTERNAL_REFUND_REFERENCE_REQUIRED","ORDER_ALREADY_ADJUSTED"];
    const code = known.find(key => error.message.includes(key)) || "FAILED";
    redirect("/dashboard/admin/monetizacao/servicos?resultado=" + code);
  }
  revalidatePath("/dashboard/admin/monetizacao/servicos");
  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/monetizacao/creditos");
  redirect("/dashboard/admin/monetizacao/servicos?resultado=success");
}

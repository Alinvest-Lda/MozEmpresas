"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const promotionTransitions: Record<string, readonly string[]> = {
  DRAFT: ["PENDING"],
  PENDING: ["ACTIVE", "PAUSED", "EXPIRED"],
  ACTIVE: ["PAUSED", "EXPIRED"],
  PAUSED: ["ACTIVE", "EXPIRED"],
  EXPIRED: [],
};
const requestTransitions: Record<string, readonly string[]> = {
  NEW: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["PROPOSAL", "CANCELLED"],
  PROPOSAL: ["AWAITING_PAYMENT", "REJECTED", "CANCELLED"],
  AWAITING_PAYMENT: ["AWAITING_PAYMENT", "PAID", "REJECTED", "CANCELLED"],
  PAID: ["APPROVED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

async function updateStatus(table: "business_promotions" | "advertising_requests", idValue: FormDataEntryValue | null, statusValue: FormDataEntryValue | null, reasonValue: FormDataEntryValue | null, origin: string, settlement?: { method: FormDataEntryValue | null; reference: FormDataEntryValue | null; amount: FormDataEntryValue | null }) {
  const id = String(idValue || "");
  const status = String(statusValue || "").toUpperCase();
  const reason = String(reasonValue || "").trim();
  const transitions = table === "business_promotions" ? promotionTransitions : requestTransitions;
  if (!z.string().uuid().safeParse(id).success || !Object.hasOwn(transitions, status)
    || reason.length < 8 || reason.length > 500) {
    redirect("/dashboard/admin/publicidade?result=error");
  }
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");

  const rpcArgs = {
    p_entity_type: table === "business_promotions" ? "BUSINESS_PROMOTION" : "ADVERTISING_REQUEST",
    p_entity_id: id,
    p_new_status: status,
    p_reason: reason,
    ...(table === "advertising_requests" ? {
      p_payment_method: status === "PAID" && settlement?.method ? String(settlement.method).toUpperCase() : null,
      p_payment_reference: status === "PAID" && settlement?.reference ? String(settlement.reference).trim() : null,
      p_paid_amount_mzn: status === "PAID" && settlement?.amount && String(settlement.amount).trim() !== "" ? Number(settlement.amount) : null,
    } : {}),
  };
  const { error } = await supabase.rpc("admin_update_advertising_status", rpcArgs);
  if (error) {
    const code = error.message.includes("ADVERTISING_REQUEST_SETTLEMENT_EVIDENCE_REQUIRED") ? "request-settlement-evidence-required"
      : error.message.includes("UNEXPECTED_SETTLEMENT_EVIDENCE") ? "request-settlement-evidence-unexpected"
      : error.message.includes("ADVERTISING_PAYMENT_NOT_SETTLED") ? "payment-not-settled"
      : error.message.includes("ADVERTISING_CAMPAIGN_WINDOW_CLOSED") ? "campaign-window-closed"
      : error.message.includes("BANK_TRANSFER_CONFIRMATION_EXPIRED") ? "bank-transfer-confirmation-expired"
      : error.message.includes("INVALID_ADVERTISING_STATUS_TRANSITION") ? "invalid-transition" : "error";
    redirect("/dashboard/admin/publicidade?result=" + code);
  }
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/publicidade");
  revalidatePath("/dashboard/admin/monetizacao");
  revalidatePath("/dashboard/admin/publicidade/" + origin);
  redirect("/dashboard/admin/publicidade?result=success");
}
export async function moderateBusinessPromotion(formData: FormData) {
  return updateStatus("business_promotions", formData.get("id"), formData.get("status"), formData.get("reason"), "empresarial");
}
export async function moderatePartnerCampaign(formData: FormData) {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "").toUpperCase();
  const reason = String(formData.get("reason") || "").trim();
  if (!z.string().uuid().safeParse(id).success || !["APPROVED", "REJECTED", "ACTIVE", "PAUSED", "ENDED"].includes(status)
    || reason.length < 8 || reason.length > 500) {
    redirect("/dashboard/admin/publicidade?result=invalid-transition");
  }
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");
  const { error } = await supabase.rpc("admin_transition_partner_ad_campaign", {
    p_campaign_id: id,
    p_new_status: status,
    p_reason: reason,
  });
  if (error) {
    const known = [
      "ADMIN_PARTNER_CAMPAIGN_STATUS_TRANSITION_INVALID",
      "CAMPAIGN_PAYMENT_NOT_SETTLED",
      "CAMPAIGN_PAYMENT_STILL_PENDING",
      "CAMPAIGN_END_DATE_NOT_REACHED",
      "CAMPAIGN_START_DATE_NOT_REACHED",
      "ADVERTISING_CAMPAIGN_WINDOW_CLOSED",
      "CAMPAIGN_NOT_FOUND",
    ].find((code) => error.message.includes(code));
    redirect("/dashboard/admin/publicidade?result=" + (known || "error"));
  }
  revalidatePath("/dashboard/admin/publicidade");
  revalidatePath("/parceiro/publicidade");
  redirect("/dashboard/admin/publicidade?result=success");
}

export async function updateAdvertisingRequest(formData: FormData) {
  return updateStatus("advertising_requests", formData.get("id"), formData.get("status"), formData.get("reason"), "pedidos", {
    method: formData.get("payment_method"),
    reference: formData.get("payment_reference"),
    amount: formData.get("paid_amount_mzn"),
  });
}

export async function confirmBusinessPromotionMpesaPayment(formData: FormData) {
  const id=String(formData.get("id")||"");
  const reference=String(formData.get("payment_reference")||"").trim();
  const amount=Number(formData.get("amount_mzn"));
  const notes=String(formData.get("notes")||"").trim();
  if(!z.string().uuid().safeParse(id).success || reference.length<4 || reference.length>160
    || !Number.isFinite(amount) || amount<=0 || amount>=1000000000000 || notes.length>500) {
    redirect("/dashboard/admin/publicidade?result=business-payment-invalid");
  }
  const {supabase,authorized}=await getSuperAdminContext();
  if(!authorized) redirect("/login?next=/dashboard/admin/publicidade");
  const {error}=await supabase.rpc("admin_confirm_business_promotion_mpesa_payment",{
    p_promotion_id:id,p_payment_reference:reference,p_amount_mzn:amount,p_notes:notes||null,
  });
  if(error) {
    const code=["PROMOTION_NOT_AWAITING_MPESA_SETTLEMENT","BUSINESS_AD_PAYMENT_AMOUNT_MISMATCH","PROMOTION_NOT_FOUND"].find(x=>error.message.includes(x))||"business-payment-error";
    redirect("/dashboard/admin/publicidade?result="+code);
  }
  revalidatePath("/dashboard/admin/publicidade");
  revalidatePath("/dashboard/publicidade");
  redirect("/dashboard/admin/publicidade?result=business-payment-confirmed");
}

export async function cancelBusinessPromotion(formData: FormData) {
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  const externalRefundReference=String(formData.get("external_refund_reference")||"").trim();
  if (!z.string().uuid().safeParse(id).success || reason.length < 8 || reason.length > 500
    || externalRefundReference.length>160) redirect("/dashboard/admin/publicidade?result=cancel-error");
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");
  const { data, error } = await supabase.rpc("admin_cancel_business_promotion", {
    p_promotion_id: id, p_reason: reason,
    p_external_refund_reference: externalRefundReference||null,
  });
  if (error) {
    const code = ["MPESA_REFUND_REQUIRED","MPESA_REFUND_REFERENCE_REQUIRED"].some(x=>error.message.includes(x)) ? "mpesa-refund-required"
      : error.message.includes("INVALID_MPESA_REFUND_REFERENCE") ? "mpesa-refund-invalid"
      : error.message.includes("CANCELLATION_NOT_ALLOWED") ? "cancel-not-allowed" : "cancel-error";
    redirect("/dashboard/admin/publicidade?result=" + code);
  }
  revalidatePath("/dashboard/admin"); revalidatePath("/dashboard/admin/publicidade"); revalidatePath("/dashboard/admin/monetizacao"); revalidatePath("/dashboard/publicidade");
  redirect("/dashboard/admin/publicidade?result=cancel-success&refund=" + String(data?.credits_refunded ?? 0)
    + "&refundType=" + encodeURIComponent(String(data?.refund_type ?? ""))
    + "&reference=" + encodeURIComponent(String(data?.external_reference ?? "")));
}

export async function issuePartnerAdPayment(formData: FormData) {
  const id = String(formData.get("id") || "");
  const method = String(formData.get("payment_method") || "").toUpperCase();
  const rawPrice = String(formData.get("price_mzn") || "").trim();
  const price = rawPrice === "" ? null : Number(rawPrice);
  if (!z.string().uuid().safeParse(id).success || !["MPESA", "CREDITS", "BANK_TRANSFER"].includes(method)
    || (price !== null && (!Number.isFinite(price) || price <= 0))) {
    redirect("/dashboard/admin/publicidade?result=payment-error");
  }
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");
  const { data, error } = await supabase.rpc("admin_issue_partner_ad_payment", {
    p_campaign_id: id,
    p_payment_method: method,
    p_price_mzn: price,
  });
  if (error) {
    const known = [
      "PARTNER_CREDIT_WALLET_NOT_LINKED", "PARTNER_CREDIT_WALLET_NOT_FOUND",
      "INSUFFICIENT_CREDITS", "CAMPAIGN_PAYMENT_ALREADY_ISSUED",
      "CAMPAIGN_NOT_PAYABLE", "CAMPAIGN_PRICE_NOT_CONFIGURED",
      "PARTNER_AD_CREDIT_PRICE_NOT_CONFIGURED", "INVALID_CAMPAIGN_PRICE", "FIXED_PRODUCT_PRICE_CANNOT_BE_OVERRIDDEN",
    ].find((code) => error.message.includes(code));
    redirect("/dashboard/admin/publicidade?result=" + (known || "payment-error"));
  }
  revalidatePath("/dashboard/admin/publicidade");
  revalidatePath("/parceiro/publicidade");
  redirect("/dashboard/admin/publicidade?result=payment-issued&method=" + method + "&reference=" + encodeURIComponent(String(data?.payment_reference || "")) + "&credits=" + String(data?.credits_charged || 0));
}

export async function confirmPartnerAdBankTransfer(formData: FormData) {
  const paymentId=String(formData.get("payment_id")||"");
  const notes=String(formData.get("notes")||"").trim();
  if(!z.string().uuid().safeParse(paymentId).success||notes.length>500){
    redirect("/dashboard/admin/publicidade?result=bank-transfer-confirmation-error");
  }
  const {supabase,authorized}=await getSuperAdminContext();
  if(!authorized) redirect("/login?next=/dashboard/admin/publicidade");
  const {error}=await supabase.rpc("admin_confirm_partner_bank_transfer",{
    p_payment_id:paymentId,
    p_notes:notes||null,
  });
  if(error){
    const known=["BANK_TRANSFER_CONFIRMATION_EXPIRED","PAYMENT_NOT_FOUND","INVALID_PAYMENT_METHOD","PAYMENT_NOT_PENDING","CAMPAIGN_PAYMENT_ORDER_MISMATCH","FINANCIAL_DOCUMENT_NOT_FOUND","FINANCIAL_DOCUMENT_PARTNER_MISMATCH","FINANCIAL_DOCUMENT_NOT_PAYABLE","FINANCIAL_DOCUMENT_OVERPAID","CAMPAIGN_NOT_FOUND","CAMPAIGN_PARTNER_MISMATCH","CAMPAIGN_PAYMENT_AMOUNT_MISMATCH"].find(code=>error.message.includes(code));
    redirect("/dashboard/admin/publicidade?result="+(known||"bank-transfer-confirmation-error"));
  }
  revalidatePath("/dashboard/admin/publicidade");
  revalidatePath("/parceiro/publicidade");
  revalidatePath("/dashboard/admin/monetizacao");
  redirect("/dashboard/admin/publicidade?result=partner-bank-transfer-confirmed");
}

export async function cancelPartnerAdCampaign(formData: FormData) {
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  const externalReference = String(formData.get("external_refund_reference") || "").trim();
  if (!z.string().uuid().safeParse(id).success || reason.length < 8 || reason.length > 1000 || externalReference.length > 160) {
    redirect("/dashboard/admin/publicidade?result=partner-cancel-error");
  }
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");
  const { data, error } = await supabase.rpc("admin_cancel_partner_ad_campaign", {
    p_campaign_id: id, p_reason: reason, p_external_refund_reference: externalReference || null,
  });
  if (error) {
    const code = ["MPESA_REFUND_REFERENCE_REQUIRED","EXTERNAL_REFUND_REFERENCE_REQUIRED","CANCELLATION_NOT_ALLOWED","CAMPAIGN_NOT_SETTLED","CAMPAIGN_ALREADY_REFUNDED","INVALID_MPESA_REFUND_REFERENCE","INVALID_EXTERNAL_REFUND_REFERENCE","BANK_TRANSFER_ACTIVATION_WINDOW_NOT_EXPIRED"].find(x=>error.message.includes(x)) || "partner-cancel-error";
    redirect("/dashboard/admin/publicidade?result="+code);
  }
  revalidatePath("/dashboard/admin/publicidade"); revalidatePath("/parceiro/publicidade"); revalidatePath("/dashboard/admin/monetizacao");
  redirect("/dashboard/admin/publicidade?result=partner-cancel-success&refund="+String(data?.credits_refunded??0)+"&refundType="+encodeURIComponent(String(data?.refund_type??""))+"&reference="+encodeURIComponent(String(data?.external_reference??"")));
}

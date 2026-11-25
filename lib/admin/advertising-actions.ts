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
  AWAITING_PAYMENT: ["PAID", "REJECTED", "CANCELLED"],
  PAID: ["APPROVED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

async function updateStatus(table: "business_promotions" | "advertising_requests", idValue: FormDataEntryValue | null, statusValue: FormDataEntryValue | null, origin: string) {
  const id = String(idValue || "");
  const status = String(statusValue || "").toUpperCase();
  const transitions = table === "business_promotions" ? promotionTransitions : requestTransitions;
  if (!z.string().uuid().safeParse(id).success || !Object.hasOwn(transitions, status)) {
    redirect("/dashboard/admin/publicidade?result=error");
  }
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");

  const { data: current, error: lookupError } = await supabase.from(table).select(table === "business_promotions" ? "id,status,payment_method,paid_at,credits_charged" : "id,status").eq("id", id).maybeSingle();
  if (lookupError || !current || !(transitions[current.status ?? ""] ?? []).includes(status)) {
    redirect("/dashboard/admin/publicidade?result=invalid-transition");
  }
  if (table === "business_promotions" && status === "ACTIVE") {
    const creditSettled = current.payment_method === "CREDITS" && Number(current.credits_charged ?? 0) > 0;
    const mpesaSettled = current.payment_method === "MPESA" && Boolean(current.paid_at);
    if (!creditSettled && !mpesaSettled) redirect("/dashboard/admin/publicidade?result=payment-not-settled");
  }
  const { data: updated, error } = await supabase.from(table).update({ status, updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", current.status).select("id").maybeSingle();
  if (error || !updated) redirect("/dashboard/admin/publicidade?result=stale");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/publicidade");
  revalidatePath("/dashboard/admin/monetizacao");
  revalidatePath("/dashboard/admin/publicidade/" + origin);
  redirect("/dashboard/admin/publicidade?result=success");
}
export async function moderateBusinessPromotion(formData: FormData) {
  return updateStatus("business_promotions", formData.get("id"), formData.get("status"), "empresarial");
}
export async function moderatePartnerCampaign(formData: FormData) {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "").toUpperCase();
  if (!z.string().uuid().safeParse(id).success || !["APPROVED", "REJECTED", "ACTIVE", "PAUSED", "ENDED"].includes(status)) {
    redirect("/dashboard/admin/publicidade?result=invalid-transition");
  }
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");
  const { error } = await supabase.rpc("admin_transition_partner_ad_campaign", {
    p_campaign_id: id,
    p_new_status: status,
  });
  if (error) {
    const known = [
      "ADMIN_PARTNER_CAMPAIGN_STATUS_TRANSITION_INVALID",
      "CAMPAIGN_PAYMENT_NOT_SETTLED",
      "CAMPAIGN_PAYMENT_STILL_PENDING",
      "CAMPAIGN_END_DATE_NOT_REACHED",
      "CAMPAIGN_NOT_FOUND",
    ].find((code) => error.message.includes(code));
    redirect("/dashboard/admin/publicidade?result=" + (known || "error"));
  }
  revalidatePath("/dashboard/admin/publicidade");
  revalidatePath("/parceiro/publicidade");
  redirect("/dashboard/admin/publicidade?result=success");
}

export async function updateAdvertisingRequest(formData: FormData) {
  return updateStatus("advertising_requests", formData.get("id"), formData.get("status"), "pedidos");
}

export async function cancelBusinessPromotion(formData: FormData) {
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!z.string().uuid().safeParse(id).success || reason.length < 8 || reason.length > 500) redirect("/dashboard/admin/publicidade?result=cancel-error");
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");
  const { data, error } = await supabase.rpc("admin_cancel_business_promotion", { p_promotion_id: id, p_reason: reason });
  if (error) {
    const code = error.message.includes("MPESA_REFUND_REQUIRED") ? "mpesa-refund-required" : error.message.includes("CANCELLATION_NOT_ALLOWED") ? "cancel-not-allowed" : "cancel-error";
    redirect("/dashboard/admin/publicidade?result=" + code);
  }
  revalidatePath("/dashboard/admin"); revalidatePath("/dashboard/admin/publicidade"); revalidatePath("/dashboard/admin/monetizacao"); revalidatePath("/dashboard/publicidade");
  redirect("/dashboard/admin/publicidade?result=cancel-success&refund=" + String(data?.credits_refunded ?? 0));
}

export async function issuePartnerAdPayment(formData: FormData) {
  const id = String(formData.get("id") || "");
  const method = String(formData.get("payment_method") || "").toUpperCase();
  const rawPrice = String(formData.get("price_mzn") || "").trim();
  const price = rawPrice === "" ? null : Number(rawPrice);
  if (!z.string().uuid().safeParse(id).success || !["MPESA", "CREDITS"].includes(method)
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
    const code = ["MPESA_REFUND_REFERENCE_REQUIRED","EXTERNAL_REFUND_REFERENCE_REQUIRED","CANCELLATION_NOT_ALLOWED","CAMPAIGN_NOT_SETTLED","CAMPAIGN_ALREADY_REFUNDED","INVALID_MPESA_REFUND_REFERENCE","INVALID_EXTERNAL_REFUND_REFERENCE"].find(x=>error.message.includes(x)) || "partner-cancel-error";
    redirect("/dashboard/admin/publicidade?result="+code);
  }
  revalidatePath("/dashboard/admin/publicidade"); revalidatePath("/parceiro/publicidade"); revalidatePath("/dashboard/admin/monetizacao");
  redirect("/dashboard/admin/publicidade?result=partner-cancel-success&refund="+String(data?.credits_refunded??0)+"&refundType="+encodeURIComponent(String(data?.refund_type??""))+"&reference="+encodeURIComponent(String(data?.external_reference??"")));
}

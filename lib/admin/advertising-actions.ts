"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const promotionStatuses = ["PENDING", "ACTIVE", "PAUSED", "EXPIRED"] as const;
const partnerStatuses = ["REQUESTED", "PENDING", "UNDER_REVIEW", "ACTIVE", "RUNNING", "PUBLISHED"] as const;
const requestStatuses = ["NEW", "CONTACTED", "PROPOSAL", "AWAITING_PAYMENT", "PAID", "APPROVED", "REJECTED", "CANCELLED"] as const;

async function updateStatus(table: string, idValue: FormDataEntryValue | null, statusValue: FormDataEntryValue | null, allowed: readonly string[], origin: string) {
  const id = String(idValue || "");
  const status = String(statusValue || "").toUpperCase();
  if (!z.string().uuid().safeParse(id).success || !allowed.includes(status)) {
    redirect("/dashboard/admin/publicidade?result=error");
  }
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/publicidade");

  const patch = { status, updated_at: new Date().toISOString() };
  let error: { message: string } | null = null;
  let updatedId: string | null = null;
  if (table === "business_promotions") {
    const result = await supabase.from("business_promotions").update(patch).eq("id", id).select("id").maybeSingle();
    error = result.error;
    updatedId = result.data?.id ?? null;
  } else if (table === "partner_ad_campaigns") {
    const result = await supabase.from("partner_ad_campaigns").update(patch).eq("id", id).select("id").maybeSingle();
    error = result.error;
    updatedId = result.data?.id ?? null;
  } else {
    const result = await supabase.from("advertising_requests").update(patch).eq("id", id).select("id").maybeSingle();
    error = result.error;
    updatedId = result.data?.id ?? null;
  }

  if (error || !updatedId) redirect("/dashboard/admin/publicidade?result=error");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/publicidade");
  revalidatePath("/dashboard/admin/monetizacao");
  revalidatePath("/dashboard/admin/publicidade/" + origin);
  redirect("/dashboard/admin/publicidade?result=success");
}

export async function moderateBusinessPromotion(formData: FormData) {
  return updateStatus("business_promotions", formData.get("id"), formData.get("status"), promotionStatuses, "empresarial");
}
export async function moderatePartnerCampaign(formData: FormData) {
  return updateStatus("partner_ad_campaigns", formData.get("id"), formData.get("status"), partnerStatuses, "parceiro");
}
export async function updateAdvertisingRequest(formData: FormData) {
  return updateStatus("advertising_requests", formData.get("id"), formData.get("status"), requestStatuses, "pedidos");
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
      "PARTNER_AD_CREDIT_PRICE_NOT_CONFIGURED", "INVALID_CAMPAIGN_PRICE",
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
    const code = ["MPESA_REFUND_REFERENCE_REQUIRED","CANCELLATION_NOT_ALLOWED","CAMPAIGN_NOT_SETTLED","CAMPAIGN_ALREADY_REFUNDED","INVALID_MPESA_REFUND_REFERENCE"].find(x=>error.message.includes(x)) || "partner-cancel-error";
    redirect("/dashboard/admin/publicidade?result="+code);
  }
  revalidatePath("/dashboard/admin/publicidade"); revalidatePath("/parceiro/publicidade"); revalidatePath("/dashboard/admin/monetizacao");
  redirect("/dashboard/admin/publicidade?result=partner-cancel-success&refund="+String(data?.credits_refunded??0));
}

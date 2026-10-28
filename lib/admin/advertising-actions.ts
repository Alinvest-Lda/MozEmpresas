"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const promotionStatuses = ["PENDING", "ACTIVE", "PAUSED", "EXPIRED", "CANCELLED"] as const;
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

  const { data, error } = await supabase.from(table)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) redirect("/dashboard/admin/publicidade?result=error");
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

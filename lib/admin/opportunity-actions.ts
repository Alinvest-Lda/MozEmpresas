"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const opportunityStatuses = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;

export async function moderateOpportunity(formData: FormData) {
  const id = String(formData.get("opportunityId") || "");
  const status = String(formData.get("status") || "").toUpperCase();

  if (!z.string().uuid().safeParse(id).success || !opportunityStatuses.includes(status as typeof opportunityStatuses[number])) {
    redirect("/dashboard/admin/oportunidades?result=error");
  }

  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/oportunidades");

  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 8 || reason.length > 500) redirect("/dashboard/admin/oportunidades?result=error");
  const { error } = await supabase.rpc("admin_set_opportunity_status", {
    p_opportunity_id: id,
    p_new_status: status,
    p_reason: reason,
  });
  if (error) redirect("/dashboard/admin/oportunidades?result=error");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/oportunidades");
  revalidatePath("/parceiro/oportunidades");
  revalidatePath("/oportunidades");
  redirect("/dashboard/admin/oportunidades?result=success");
}

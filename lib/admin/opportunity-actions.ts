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

  const { data: updated, error } = await supabase
    .from("opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !updated) redirect("/dashboard/admin/oportunidades?result=error");

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/oportunidades");
  revalidatePath("/parceiro/oportunidades");
  revalidatePath("/oportunidades");
  redirect("/dashboard/admin/oportunidades?result=success");
}

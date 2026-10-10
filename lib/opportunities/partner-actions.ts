"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const allowedApplicationStatuses = ["UNDER_REVIEW","SHORTLISTED","ACCEPTED","REJECTED","WITHDRAWN"] as const;

export async function changeOpportunityStatus(formData: FormData) {
  const id = String(formData.get("opportunity_id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["PUBLISHED","CLOSED","ARCHIVED","DRAFT"].includes(status)) redirect("/parceiro/oportunidades?error=status");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { error } = await supabase.from("opportunities").update({status,updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",userId);
  if (error) redirect("/parceiro/oportunidades?error=status");
  revalidatePath("/parceiro/oportunidades");
  revalidatePath("/oportunidades");
  redirect("/parceiro/oportunidades?updated=1");
}

export async function changeOpportunityApplicationStatus(formData: FormData) {
  const id = String(formData.get("application_id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !allowedApplicationStatuses.includes(status as typeof allowedApplicationStatuses[number])) redirect("/parceiro/oportunidades/candidaturas?error=status");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");
  const { error } = await supabase.from("opportunity_applications").update({status,updated_at:new Date().toISOString()}).eq("id",id);
  if (error) redirect("/parceiro/oportunidades/candidaturas?error=status");
  revalidatePath("/parceiro/oportunidades/candidaturas");
  redirect("/parceiro/oportunidades/candidaturas?updated=1");
}

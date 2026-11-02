"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePartnerAccount } from "@/lib/auth/access";
import { canManagePartnerOpportunity } from "@/lib/auth/partner-permissions";
import { canTransitionOpportunity, canTransitionPartnerApplication } from "@/lib/opportunities/state-machine";

async function partnerManager() {
  const context = await requirePartnerAccount();
  if (!context.user || !canManagePartnerOpportunity(context.partnerContext.member_role)) {
    redirect("/parceiro/oportunidades?error=forbidden");
  }
  return { supabase: context.supabase, userId: context.user.id, accountId: context.partnerContext.account_id };
}

export async function changeOpportunityStatus(formData: FormData) {
  const id = String(formData.get("opportunity_id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["PUBLISHED", "CLOSED", "ARCHIVED", "DRAFT"].includes(status)) {
    redirect("/parceiro/oportunidades?error=status");
  }
  const { supabase, accountId } = await partnerManager();

  const { data: currentOpportunity, error: readError } = await supabase
    .from("opportunities")
    .select("id,status")
    .eq("id", id)
    .eq("partner_account_id", accountId)
    .maybeSingle();
  if (readError || !currentOpportunity || !canTransitionOpportunity(currentOpportunity.status, status)) {
    redirect("/parceiro/oportunidades?error=status");
  }

  const { data: updatedOpportunity, error } = await supabase
    .from("opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("partner_account_id", accountId)
    .eq("status", currentOpportunity.status)
    .select("id")
    .maybeSingle();
  if (error || !updatedOpportunity) redirect("/parceiro/oportunidades?error=status");
  revalidatePath("/parceiro/oportunidades");
  revalidatePath("/oportunidades");
  redirect("/parceiro/oportunidades?updated=1");
}

export async function changeOpportunityApplicationStatus(formData: FormData) {
  const id = String(formData.get("application_id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["UNDER_REVIEW", "SHORTLISTED", "ACCEPTED", "REJECTED"].includes(status)) {
    redirect("/parceiro/oportunidades/candidaturas?error=status");
  }
  const { supabase, accountId } = await partnerManager();

  const { data: application, error: applicationError } = await supabase
    .from("opportunity_applications")
    .select("id,opportunity_id,status")
    .eq("id", id)
    .maybeSingle();
  if (applicationError || !application || !canTransitionPartnerApplication(application.status, status)) {
    redirect("/parceiro/oportunidades/candidaturas?error=status");
  }

  const { data: ownedOpportunity, error: ownershipError } = await supabase
    .from("opportunities")
    .select("id")
    .eq("id", application.opportunity_id)
    .eq("partner_account_id", accountId)
    .maybeSingle();
  if (ownershipError || !ownedOpportunity) redirect("/parceiro/oportunidades/candidaturas?error=status");

  const { data: updatedApplication, error } = await supabase
    .from("opportunity_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("opportunity_id", application.opportunity_id)
    .eq("status", application.status)
    .select("id")
    .maybeSingle();
  if (error || !updatedApplication) redirect("/parceiro/oportunidades/candidaturas?error=status");
  revalidatePath("/parceiro/oportunidades/candidaturas");
  redirect("/parceiro/oportunidades/candidaturas?updated=1");
}

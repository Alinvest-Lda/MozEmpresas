"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePartnerAccount } from "@/lib/auth/access";
import { canManagePartnerOpportunity } from "@/lib/auth/partner-permissions";
import { canTransitionOpportunity, canTransitionPartnerApplication } from "@/lib/opportunities/state-machine";
import { isValidOpportunityId } from "@/lib/opportunities/validation";

async function partnerOwner() {
  const context = await requirePartnerAccount();
  if (!context.user || !canManagePartnerOpportunity(context.partnerContext.member_role)) {
    redirect("/parceiro/oportunidades?error=forbidden");
  }
  return { supabase: context.supabase, userId: context.user.id, accountId: context.partnerContext.account_id };
}

export async function changeOpportunityStatus(formData: FormData) {
  const id = String(formData.get("opportunity_id") || "");
  const status = String(formData.get("status") || "");
  if (!isValidOpportunityId(id) || !["PUBLISHED", "CLOSED", "ARCHIVED", "DRAFT"].includes(status)) {
    redirect("/parceiro/oportunidades?error=status");
  }
  const { supabase } = await partnerOwner();
  const { error } = await supabase.rpc("partner_change_opportunity_status_f372", {
    p_opportunity_id: id,
    p_new_status: status,
  });
  if (error) {
    if (error.message?.includes("OPPORTUNITY_OUTSIDE_PUBLICATION_WINDOW")) {
      redirect("/parceiro/oportunidades?error=deadline");
    }
    redirect("/parceiro/oportunidades?error=status");
  }
  revalidatePath("/parceiro/oportunidades");
  revalidatePath("/oportunidades");
  redirect("/parceiro/oportunidades?updated=1");
}

export async function changeOpportunityApplicationStatus(formData: FormData) {
  const id = String(formData.get("application_id") || "");
  const status = String(formData.get("status") || "");
  if (!isValidOpportunityId(id) || !["UNDER_REVIEW", "SHORTLISTED", "ACCEPTED", "REJECTED"].includes(status)) {
    redirect("/parceiro/oportunidades/candidaturas?error=status");
  }
  const { supabase } = await partnerOwner();
  const { error } = await supabase.rpc("partner_change_application_status_f372", {
    p_application_id: id,
    p_new_status: status,
  });
  if (error) redirect("/parceiro/oportunidades/candidaturas?error=status");
  revalidatePath("/parceiro/oportunidades/candidaturas");
  redirect("/parceiro/oportunidades/candidaturas?updated=1");
}

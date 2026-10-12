"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { savePublicationAttachments } from "@/lib/publications/attachments";
import { canManageBusiness } from "@/lib/businesses/permissions";

const text = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";

async function user() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}

export async function applyToOpportunity(formData: FormData) {
  const { supabase, userId } = await user();
  const opportunityId = text(formData.get("opportunity_id"));
  const businessId = text(formData.get("business_id")) || null;
  const coverNote = text(formData.get("cover_note")) || null;
  if (!opportunityId) redirect("/oportunidades");

  if (businessId && !(await canManageBusiness(supabase, userId, businessId))) {
    // Association alone is insufficient: viewer/member roles cannot act for a business.
    redirect("/oportunidades?application=forbidden");
  }
  if (coverNote && coverNote.length > 5000) redirect("/oportunidades?application=error");

  const { data: opportunity } = await supabase.from("opportunities").select("id,status,opens_at,closes_at,owner_id").eq("id", opportunityId).maybeSingle();
  if (!opportunity || opportunity.owner_id === userId || opportunity.status !== "PUBLISHED" || (opportunity.opens_at && new Date(opportunity.opens_at).getTime() > Date.now()) || (opportunity.closes_at && new Date(opportunity.closes_at).getTime() < Date.now())) redirect("/oportunidades?application=closed");

  const { data: existingApplication, error: existingError } = await supabase
    .from("opportunity_applications")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("applicant_user_id", userId)
    .maybeSingle();
  if (existingError) redirect("/oportunidades?application=error");

  let submissionError;
  if (existingApplication) {
    const { error } = await supabase
      .from("opportunity_applications")
      .update({ applicant_business_id: businessId, cover_note: coverNote })
      .eq("id", existingApplication.id)
      .eq("applicant_user_id", userId);
    submissionError = error;
  } else {
    const { error } = await supabase.from("opportunity_applications").insert({
      opportunity_id: opportunityId,
      applicant_user_id: userId,
      applicant_business_id: businessId,
      cover_note: coverNote,
      status: "SUBMITTED",
      submitted_at: new Date().toISOString()
    });
    submissionError = error;
    // The database trigger notifies the opportunity owner after a successful insert.
  }
  if (submissionError) redirect("/oportunidades?application=error");
  await supabase.from("platform_conversion_events").insert({
    user_id: userId,
    visitor_key: "user:" + userId,
    event_type: "OPPORTUNITY_APPLY",
    entity_type: "opportunity",
    entity_id: opportunityId,
    source: "opportunity_detail",
    metadata: { action: existingApplication ? "updated" : "submitted" },
  });
  redirect("/oportunidades/" + (formData.get("slug") || "") + "?application=submitted");
}


export async function createOpportunity(formData: FormData) {
  const { supabase, userId } = await user();
  const title = text(formData.get("title"));
  const type = text(formData.get("type")).toUpperCase();
  const description = text(formData.get("description"));
  const organization = text(formData.get("organization")) || null;
  const location = text(formData.get("location")) || null;
  const requirements = text(formData.get("requirements")) || null;
  const opensAt = text(formData.get("opens_at")) || null;
  const closesAt = text(formData.get("closes_at")) || null;

  if (!title || !description || !["CALL","FUNDING","PARTNERSHIP","TRAINING","EVENT"].includes(type)) {
    redirect("/dashboard/oportunidades?publish=error");
  }
  if (closesAt && opensAt && new Date(closesAt).getTime() < new Date(opensAt).getTime()) {
    redirect("/dashboard/oportunidades?publish=error");
  }

  const base = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "oportunidade";
  const slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: createdOpportunity, error } = await supabase.from("opportunities").insert({
    owner_id: userId,
    title,
    slug,
    type,
    description,
    organization,
    location,
    requirements,
    opens_at: opensAt ? new Date(opensAt).toISOString() : null,
    closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    status: "PUBLISHED",
  }).select("id").single();

  if (error) redirect("/dashboard/oportunidades?publish=error");
  try {
    await savePublicationAttachments(supabase, userId, "OPPORTUNITY", createdOpportunity?.id ?? "", formData.getAll("attachments"));
  } catch {
    // The publication remains valid; attachments are optional and can be added later.
  }
  redirect("/dashboard/oportunidades?publish=success");
}

export async function updateOpportunityStatus(formData: FormData) {
  const { supabase, userId } = await user();
  const opportunityId = text(formData.get("opportunity_id"));
  const status = text(formData.get("status")).toUpperCase();
  if (!opportunityId || !["PUBLISHED", "CLOSED", "ARCHIVED"].includes(status)) {
    redirect("/dashboard/oportunidades?status=error");
  }

  const { data: opportunity, error: lookupError } = await supabase
    .from("opportunities")
    .select("id,status")
    .eq("id", opportunityId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (lookupError || !opportunity) redirect("/dashboard/oportunidades?status=forbidden");
  if (opportunity.status === "ARCHIVED" && status !== "ARCHIVED") {
    redirect("/dashboard/oportunidades?status=invalid-transition");
  }
  if (opportunity.status === status) redirect("/dashboard/oportunidades?status=unchanged");

  const { data: updated, error } = await supabase
    .from("opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", opportunityId)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !updated) redirect("/dashboard/oportunidades?status=error");

  revalidatePath("/dashboard/oportunidades");
  revalidatePath("/oportunidades");
  redirect("/dashboard/oportunidades?status=updated");
}


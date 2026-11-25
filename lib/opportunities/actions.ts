"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireNormalAccount } from "@/lib/auth/access";
import { savePublicationAttachments } from "@/lib/publications/attachments";
import { isValidOpportunityId } from "@/lib/opportunities/validation";

const text = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";

function parseMaputoDate(value: string | null): Date | null {
  if (!value) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const parsed = new Date(hasTimezone ? value : value + "+02:00");
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

async function user() {
  const context = await requireNormalAccount();
  if (!context.user) redirect("/login");
  return { supabase: context.supabase, userId: context.user.id };
}
export async function applyToOpportunity(formData: FormData) {
  const { supabase, userId } = await user();
  const opportunityId = text(formData.get("opportunity_id"));
  const businessId = text(formData.get("business_id")) || null;
  const coverNote = text(formData.get("cover_note")) || null;
  if (!isValidOpportunityId(opportunityId)) redirect("/oportunidades?application=error");

  if (coverNote && coverNote.length > 5000) redirect("/oportunidades?application=error");

  const { data: submission, error: submissionError } = await supabase.rpc("submit_opportunity_application", {
    p_opportunity_id: opportunityId,
    p_applicant_business_id: businessId,
    p_cover_note: coverNote,
  });
  if (submissionError) {
    const message = submissionError.message || "";
    if (message.includes("BUSINESS_MANAGEMENT_REQUIRED")) redirect("/oportunidades?application=forbidden");
    if (message.includes("APPLICATION_NOT_EDITABLE")) redirect("/oportunidades?application=locked");
    if (message.includes("OPPORTUNITY_NOT_OPEN")) redirect("/oportunidades?application=closed");
    redirect("/oportunidades?application=error");
  }
  const action = submission?.action === "updated" ? "updated" : "submitted";
  await supabase.from("platform_conversion_events").insert({
    user_id: userId,
    visitor_key: "user:" + userId,
    event_type: "OPPORTUNITY_APPLY",
    entity_type: "opportunity",
    entity_id: opportunityId,
    source: "opportunity_detail",
    metadata: { action },
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

  const allowedTypes = ["CALL", "TENDER", "FUNDING", "PARTNERSHIP", "TRAINING", "EVENT", "BUSINESS", "OTHER"];
  const opensDate = parseMaputoDate(opensAt);
  const closesDate = parseMaputoDate(closesAt);
  const opensTime = opensDate?.getTime() ?? null;
  const closesTime = closesDate?.getTime() ?? null;
  if (
    title.length < 4 || title.length > 180 ||
    description.length < 10 || description.length > 10000 ||
    !allowedTypes.includes(type) ||
    (organization && organization.length > 180) ||
    (location && location.length > 180) ||
    (requirements && requirements.length > 5000) ||
    (opensTime !== null && !Number.isFinite(opensTime)) ||
    (closesTime !== null && !Number.isFinite(closesTime)) ||
    (closesTime !== null && opensTime !== null && closesTime < opensTime)
  ) {
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
    opens_at: opensDate?.toISOString() ?? null,
    closes_at: closesDate?.toISOString() ?? null,
    status: "PUBLISHED",
  }).select("id").single();

  if (error) redirect("/dashboard/oportunidades?publish=error");
  let attachmentFailure = false;
  try {
    await savePublicationAttachments(supabase, userId, "OPPORTUNITY", createdOpportunity?.id ?? "", formData.getAll("attachments"));
  } catch {
    // Publication remains committed, but the user must be told that selected files were not attached.
    attachmentFailure = formData.getAll("attachments").some((entry) => typeof File !== "undefined" && entry instanceof File && entry.size > 0);
  }
  redirect(attachmentFailure
    ? "/dashboard/oportunidades?publish=attachments-error"
    : "/dashboard/oportunidades?publish=success");
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


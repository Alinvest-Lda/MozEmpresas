"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (businessId) {
    const { data: membership } = await supabase.from("business_members").select("id").eq("business_id", businessId).eq("user_id", userId).maybeSingle();
    const { data: owned } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", userId).maybeSingle();
    if (!membership && !owned) redirect("/oportunidades?application=forbidden");
  }

  const { data: opportunity } = await supabase.from("opportunities").select("id,status,closes_at,owner_id").eq("id", opportunityId).maybeSingle();
  if (!opportunity || opportunity.owner_id === userId || opportunity.status !== "PUBLISHED" || (opportunity.closes_at && new Date(opportunity.closes_at).getTime() < Date.now())) redirect("/oportunidades?application=closed");

  const { error } = await supabase.from("opportunity_applications").upsert({
    opportunity_id: opportunityId, applicant_user_id: userId, applicant_business_id: businessId,
    cover_note: coverNote, status: "SUBMITTED", submitted_at: new Date().toISOString()
  }, { onConflict: "opportunity_id,applicant_user_id" });
  if (error) redirect("/oportunidades?application=error");

  await supabase.from("notifications").insert({
    user_id: opportunity.owner_id, type: "OPPORTUNITY_APPLICATION", title: "Nova resposta a uma oportunidade",
    body: "Uma candidatura foi submetida no MozEmpresas.", resource_type: "opportunity", resource_id: opportunityId
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

  const { error } = await supabase.from("opportunities").insert({
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
  });

  if (error) redirect("/dashboard/oportunidades?publish=error");
  redirect("/dashboard/oportunidades?publish=success");
}

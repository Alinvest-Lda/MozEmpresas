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

export async function applyToContest(formData: FormData) {
  const { supabase, userId } = await user();
  const contestId = text(formData.get("contest_id"));
  const businessId = text(formData.get("business_id")) || null;
  const coverNote = text(formData.get("cover_note")) || null;
  const slug = text(formData.get("slug"));
  if (!contestId) redirect("/concursos");

  if (businessId) {
    const { data: member } = await supabase.from("business_members").select("id").eq("business_id", businessId).eq("user_id", userId).maybeSingle();
    const { data: owned } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", userId).maybeSingle();
    if (!member && !owned) redirect("/concursos?application=forbidden");
  }

  const { data: contest } = await supabase.from("contests").select("id,status,closes_at,owner_id").eq("id",contestId).maybeSingle();
  if (!contest || contest.owner_id === userId || contest.status !== "OPEN" || (contest.closes_at && new Date(contest.closes_at).getTime() < Date.now())) redirect("/concursos?application=closed");

  const { error } = await supabase.from("contest_applications").upsert({
    contest_id: contestId, applicant_user_id: userId, applicant_business_id: businessId,
    cover_note: coverNote, status: "SUBMITTED", submitted_at: new Date().toISOString()
  }, { onConflict: "contest_id,applicant_user_id" });
  if (error) redirect("/concursos?application=error");

  await supabase.from("notifications").insert({
    user_id: contest.owner_id, type: "CONTEST_APPLICATION", title: "Nova candidatura a concurso",
    body: "Uma candidatura foi submetida no MozEmpresas.", resource_type: "contest", resource_id: contestId
  });
  redirect("/concursos/" + slug + "?application=submitted");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";

const supportAreas = [
  "Técnico",
  "Comercial",
  "Conta e acessos",
  "Pagamentos e créditos",
  "Publicidade",
  "Serviços MozEmpresas",
] as const;

async function activeUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/suporte");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !profile || (profile.account_status && profile.account_status !== "ACTIVE")) {
    redirect("/login?inactive=1");
  }
  return { supabase, user };
}

export async function createSupportTicket(formData: FormData) {
  const area = String(formData.get("area") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const businessId = String(formData.get("business_id") || "").trim() || null;

  if (
    !supportAreas.includes(area as (typeof supportAreas)[number]) ||
    subject.length < 3 ||
    subject.length > 180 ||
    body.length < 10 ||
    body.length > 5000
  ) {
    redirect("/dashboard/suporte?status=invalid");
  }

  const { supabase, user } = await activeUser();

  if (businessId) {
    const managedIds = await getManagedBusinessIds(supabase, user.id);
    if (!managedIds.includes(businessId)) {
      redirect("/dashboard/suporte?status=business-denied");
    }
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      business_id: businessId,
      area,
      subject,
      status: "OPEN",
      priority: "NORMAL",
    })
    .select("id")
    .single();

  if (ticketError || !ticket) redirect("/dashboard/suporte?status=error");

  const { error: messageError } = await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_user_id: user.id,
    sender_role: "USER",
    body,
  });

  if (messageError) {
    // Avoid leaving an empty ticket when the initial message could not be saved.
    await supabase.from("support_tickets").delete().eq("id", ticket.id).eq("user_id", user.id);
    redirect("/dashboard/suporte?status=error");
  }

  revalidatePath("/dashboard/suporte");
  redirect("/dashboard/suporte?status=created");
}

export async function addSupportMessage(formData: FormData) {
  const ticketId = String(formData.get("ticket_id") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!ticketId || body.length < 1 || body.length > 5000) {
    redirect("/dashboard/suporte?status=invalid");
  }

  const { supabase, user } = await activeUser();

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id,status")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ticketError || !ticket) redirect("/dashboard/suporte?status=reply-error");

  const { error: messageError } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_user_id: user.id,
    sender_role: "USER",
    body,
  });
  if (messageError) redirect("/dashboard/suporte?status=reply-error");

  const { error: updateError } = await supabase
    .from("support_tickets")
    .update({ status: "OPEN", updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/suporte");
  if (updateError) redirect("/dashboard/suporte?status=reply-error");
  redirect("/dashboard/suporte?status=replied");
}

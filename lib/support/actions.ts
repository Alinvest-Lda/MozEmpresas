"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireNormalAccount } from "@/lib/auth/access";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";

const supportAreas = ["Técnico", "Comercial", "Conta e acessos", "Pagamentos e créditos", "Publicidade", "Serviços MozEmpresas"] as const;

async function activeUser() {
  const context = await requireNormalAccount();
  if (!context.user) redirect("/login?next=/dashboard/suporte");
  return { supabase: context.supabase, user: context.user };
}

export async function createSupportTicket(formData: FormData) {
  const area = String(formData.get("area") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const businessId = String(formData.get("business_id") || "").trim() || null;
  if (!supportAreas.includes(area as (typeof supportAreas)[number]) || subject.length < 3 || subject.length > 180 || body.length < 10 || body.length > 5000) {
    redirect("/dashboard/suporte?status=invalid");
  }
  const { supabase, user } = await activeUser();
  if (businessId) {
    const managedIds = await getManagedBusinessIds(supabase, user.id);
    if (!managedIds.includes(businessId)) redirect("/dashboard/suporte?status=business-denied");
  }
  const { data: ticketId, error: ticketError } = await supabase.rpc("create_support_ticket_with_message", {
    p_area: area, p_subject: subject, p_business_id: businessId, p_body: body,
  });
  if (ticketError || !ticketId) redirect("/dashboard/suporte?status=error");
  revalidatePath("/dashboard/suporte");
  redirect("/dashboard/suporte?status=created");
}

export async function addSupportMessage(formData: FormData) {
  const ticketId = String(formData.get("ticket_id") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!ticketId || body.length < 1 || body.length > 5000) redirect("/dashboard/suporte?status=invalid");
  const { supabase } = await activeUser();
  const { error } = await supabase.rpc("reply_to_support_ticket", { p_ticket_id: ticketId, p_body: body });
  if (error) redirect("/dashboard/suporte?status=reply-error");
  revalidatePath("/dashboard/suporte");
  redirect("/dashboard/suporte?status=replied");
}

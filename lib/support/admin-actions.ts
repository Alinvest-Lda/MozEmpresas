"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { canTransitionSupportTicket, isSupportTicketStatus } from "@/lib/support/state-machine";

const replySchema = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(5000) });
const statusSchema = z.object({ ticketId: z.string().uuid(), status: z.string().min(1) });

export async function assignSupportTicket(formData: FormData): Promise<void> {
  const ticketId = String(formData.get("ticket_id") || "");
  const assignee = String(formData.get("assigned_to") || "").trim() || null;
  if (!z.string().uuid().safeParse(ticketId).success || (assignee && !z.string().uuid().safeParse(assignee).success)) redirect("/dashboard/admin/suporte?result=error");
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/suporte");
  if (assignee) {
    const { data: member, error: memberError } = await supabase.from("platform_members").select("user_id")
      .eq("user_id", assignee).eq("active", true).eq("role", "super_admin").maybeSingle();
    if (memberError || !member) redirect("/dashboard/admin/suporte?result=error");
  }
  const { data: updated, error } = await supabase.from("support_tickets")
    .update({ assigned_to: assignee, updated_at: new Date().toISOString() }).eq("id", ticketId).select("id").maybeSingle();
  if (error || !updated) redirect("/dashboard/admin/suporte?result=error");
  revalidatePath("/dashboard/admin/suporte");
  revalidatePath("/dashboard/suporte");
  redirect("/dashboard/admin/suporte?result=success");
}

export async function updateSupportTicketStatus(formData: FormData): Promise<void> {
  const parsed = statusSchema.safeParse({ ticketId: formData.get("ticket_id"), status: formData.get("status") });
  if (!parsed.success || !isSupportTicketStatus(parsed.data.status)) redirect("/dashboard/admin/suporte?result=error");
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/suporte");
  const { data: ticket, error: ticketError } = await supabase.from("support_tickets")
    .select("id,status").eq("id", parsed.data.ticketId).maybeSingle();
  if (ticketError || !ticket) redirect("/dashboard/admin/suporte?result=error");
  if (!canTransitionSupportTicket(ticket.status, parsed.data.status)) redirect("/dashboard/admin/suporte?result=stale");
  const closedAt = parsed.data.status === "CLOSED" ? new Date().toISOString() : null;
  const { data: updated, error } = await supabase.from("support_tickets")
    .update({ status: parsed.data.status, closed_at: closedAt, updated_at: new Date().toISOString() })
    .eq("id", ticket.id).eq("status", ticket.status).select("id").maybeSingle();
  if (error || !updated) redirect("/dashboard/admin/suporte?result=stale");
  revalidatePath("/dashboard/admin/suporte");
  revalidatePath("/dashboard/suporte");
  redirect("/dashboard/admin/suporte?result=success");
}

export async function replySupportAsStaff(formData: FormData): Promise<{ success: true } | { error: string; saved?: boolean }> {
  const parsed = replySchema.safeParse({ ticketId: formData.get("ticket_id"), body: formData.get("body") });
  if (!parsed.success) return { error: "A resposta é inválida ou excede o limite permitido." };
  const { supabase, user, authorized } = await getSuperAdminContext();
  if (!user || !authorized) return { error: "Sem autorização para responder a atendimentos." };
  const { error } = await supabase.rpc("reply_to_support_ticket_as_staff", { p_ticket_id: parsed.data.ticketId, p_body: parsed.data.body });
  if (error) return { error: "Não foi possível registar a resposta. Confirme o estado do atendimento e tente novamente." };
  revalidatePath("/dashboard/admin/suporte");
  revalidatePath("/dashboard/suporte");
  return { success: true };
}

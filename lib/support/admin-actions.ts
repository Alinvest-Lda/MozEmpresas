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
  const reason = String(formData.get("reason") || "").trim();
  if (!z.string().uuid().safeParse(ticketId).success || (assignee && !z.string().uuid().safeParse(assignee).success) || reason.length < 8 || reason.length > 500) redirect("/dashboard/admin/suporte?result=error");
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/suporte");
  const { error } = await supabase.rpc("admin_set_support_ticket_assignee", {
    p_ticket_id: ticketId, p_assignee_id: assignee, p_reason: reason,
  });
  if (error) redirect("/dashboard/admin/suporte?result=error");
  revalidatePath("/dashboard/admin/suporte");
  revalidatePath("/dashboard/suporte");
  redirect("/dashboard/admin/suporte?result=success");
}

export async function updateSupportTicketStatus(formData: FormData): Promise<void> {
  const parsed = statusSchema.safeParse({ ticketId: formData.get("ticket_id"), status: formData.get("status") });
  const reason = String(formData.get("reason") || "").trim();
  if (!parsed.success || !isSupportTicketStatus(parsed.data.status)) redirect("/dashboard/admin/suporte?result=error");
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/suporte");
  if (reason.length < 8 || reason.length > 500) redirect("/dashboard/admin/suporte?result=error");
  const { error } = await supabase.rpc("admin_set_support_ticket_status", {
    p_ticket_id: parsed.data.ticketId, p_status: parsed.data.status, p_reason: reason,
  });
  if (error) redirect("/dashboard/admin/suporte?result=stale");
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { canTransitionSupportTicket, isSupportTicketStatus } from "@/lib/support/state-machine";

const replySchema = z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(5000) });
const statusSchema = z.object({ ticketId: z.string().uuid(), status: z.string().min(1) });

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
  const { data: ticket, error: ticketError } = await supabase.from("support_tickets")
    .select("id,status").eq("id", parsed.data.ticketId).maybeSingle();
  if (ticketError || !ticket) return { error: "Atendimento não encontrado." };
  if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
    return { error: "Este atendimento está encerrado ou resolvido. Reabra-o antes de enviar uma nova resposta." };
  }
  const { error: messageError } = await supabase.from("support_messages").insert({
    ticket_id: parsed.data.ticketId, sender_user_id: user.id, sender_role: "BACKOFFICE", body: parsed.data.body,
  });
  if (messageError) return { error: "Não foi possível registar a resposta." };
  if (ticket.status !== "WAITING_USER") {
    const { data: updated, error: updateError } = await supabase.from("support_tickets")
      .update({ status: "WAITING_USER", updated_at: new Date().toISOString() })
      .eq("id", parsed.data.ticketId).eq("status", ticket.status).select("id").maybeSingle();
    if (updateError || !updated) {
      revalidatePath("/dashboard/admin/suporte");
      revalidatePath("/dashboard/suporte");
      return { error: "A resposta foi registada, mas o estado mudou em simultâneo. Consulte o histórico antes de tentar novamente.", saved: true };
    }
  }
  revalidatePath("/dashboard/admin/suporte");
  revalidatePath("/dashboard/suporte");
  return { success: true };
}

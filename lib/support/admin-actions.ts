"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export async function replySupportAsStaff(formData: FormData): Promise<{ success: true } | { error: string }> {
  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticket_id"),
    body: formData.get("body"),
  });

  if (!parsed.success) return { error: "A resposta é inválida ou excede o limite permitido." };

  const { supabase, user, authorized } = await getSuperAdminContext();
  if (!user || !authorized) {
    return { error: "Sem autorização para responder a atendimentos." };
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();

  if (ticketError || !ticket) return { error: "Atendimento não encontrado." };

  const { error: messageError } = await supabase.from("support_messages").insert({
    ticket_id: parsed.data.ticketId,
    sender_user_id: user.id,
    sender_role: "BACKOFFICE",
    body: parsed.data.body,
  });

  if (messageError) return { error: "Não foi possível registar a resposta." };

  const { error: updateError } = await supabase
    .from("support_tickets")
    .update({ status: "WAITING_USER", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.ticketId);

  if (updateError) {
    return { error: "A resposta foi registada, mas não foi possível actualizar o estado do atendimento. Confirme o histórico antes de repetir." };
  }

  revalidatePath("/dashboard/admin/suporte");
  return { success: true };
}

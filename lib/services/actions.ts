"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  serviceId: z.string().uuid(),
  businessId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

const requestStatuses = ["REQUESTED", "UNDER_REVIEW", "QUOTED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"] as const;

async function currentPlatformMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null };
  const { data: member } = await supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle();
  return { supabase, user, member };
}

export async function requestPlatformService(formData: FormData) {
  const parsed = schema.safeParse({
    serviceId: formData.get("serviceId"),
    businessId: formData.get("businessId") || "",
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Verifique os dados do pedido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Inicie sessão para solicitar este serviço." };

  if (parsed.data.businessId) {
    const { data: access } = await supabase.from("businesses").select("id").eq("id", parsed.data.businessId).eq("owner_id", user.id).maybeSingle();
    if (!access) return { error: "Não tem autorização para solicitar o serviço em nome desta empresa." };
  }

  const { error } = await supabase.from("service_requests").insert({
    service_id: parsed.data.serviceId,
    requester_user_id: user.id,
    requester_business_id: parsed.data.businessId || null,
    notes: parsed.data.notes || null,
  });
  if (error) return { error: "Não foi possível registar o pedido. Tente novamente." };

  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updatePlatformServiceRequest(formData: FormData) {
  const requestId = String(formData.get("requestId") || "");
  const status = String(formData.get("status") || "").toUpperCase();
  const requestedPriceRaw = String(formData.get("requestedPrice") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!z.string().uuid().safeParse(requestId).success || !requestStatuses.includes(status as typeof requestStatuses[number])) {
    return { error: "Pedido ou estado inválido." };
  }

  const requestedPrice = requestedPriceRaw ? Number(requestedPriceRaw.replace(",", ".")) : null;
  if (requestedPriceRaw && (requestedPrice === null || !Number.isFinite(requestedPrice) || requestedPrice < 0)) {
    return { error: "O valor proposto é inválido." };
  }

  const { supabase, user, member } = await currentPlatformMember();
  if (!user || !member?.active) return { error: "Sem autorização para gerir pedidos." };

  const { error } = await supabase.from("service_requests").update({
    status,
    requested_price: requestedPrice,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }).eq("id", requestId);

  if (error) return { error: "Não foi possível actualizar o pedido." };

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/servicos");
  return { success: true };
}

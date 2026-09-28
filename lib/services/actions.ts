"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  serviceId: z.string().uuid(),
  businessId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

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
  return { success: true };
}

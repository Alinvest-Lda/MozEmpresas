"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const listingStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "SOLD_OUT", "ARCHIVED"] as const;

async function requirePlatformMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null };
  const { data: member } = await supabase
    .from("platform_members")
    .select("role,active")
    .eq("user_id", user.id)
    .maybeSingle();
  return { supabase, user, member };
}

export async function moderateBusiness(formData: FormData) {
  const id = String(formData.get("businessId") || "");
  const isPublic = String(formData.get("isPublic") || "") === "true";
  if (!z.string().uuid().safeParse(id).success) return { error: "Empresa inválida." };

  const { supabase, user, member } = await requirePlatformMember();
  if (!user || !member?.active) return { error: "Sem autorização para moderar empresas." };

  const { error } = await supabase.from("businesses").update({
    is_public: isPublic,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) return { error: "Não foi possível actualizar a visibilidade da empresa." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/empresas");
  return { success: true };
}

export async function moderateListing(formData: FormData) {
  const id = String(formData.get("listingId") || "");
  const status = String(formData.get("status") || "").toUpperCase();
  if (!z.string().uuid().safeParse(id).success || !listingStatuses.includes(status as typeof listingStatuses[number])) {
    return { error: "Oferta ou estado inválido." };
  }

  const { supabase, user, member } = await requirePlatformMember();
  if (!user || !member?.active) return { error: "Sem autorização para moderar ofertas." };

  const { error } = await supabase.from("listings").update({
    status,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) return { error: "Não foi possível actualizar o estado da oferta." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/marketplace");
  return { success: true };
}

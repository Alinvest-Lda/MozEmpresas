"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const listingStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "SOLD_OUT", "ARCHIVED"] as const;

export async function moderateBusiness(formData: FormData) {
  const id = String(formData.get("businessId") || "");
  const isPublic = String(formData.get("isPublic") || "") === "true";
  if (!z.string().uuid().safeParse(id).success) return { error: "Empresa inválida." };

  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return { error: "Sem autorização para moderar empresas." };

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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const listingTransitions: Record<string, readonly string[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["PAUSED", "SOLD_OUT", "ARCHIVED"],
  PAUSED: ["PUBLISHED", "SOLD_OUT", "ARCHIVED"],
  SOLD_OUT: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};

export async function moderateBusiness(formData: FormData) {
  const id = String(formData.get("businessId") || "");
  const rawVisibility = String(formData.get("isPublic") || "");
  if (!z.string().uuid().safeParse(id).success || !["true", "false"].includes(rawVisibility)) {
    return { error: "Empresa ou visibilidade inválida." };
  }
  const isPublic = rawVisibility === "true";

  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return { error: "Sem autorização para moderar empresas." };

  // Archived businesses must remain outside the visibility workflow, even if the action is called directly.
  const { data: updatedBusiness, error } = await supabase
    .from("businesses")
    .update({
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updatedBusiness) {
    return { error: "Não foi possível actualizar a empresa. Confirme se existe e não está arquivada." };
  }
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/empresas");
  revalidatePath("/empresas");
  return { success: true };
}

export async function moderateListing(formData: FormData) {
  const id = String(formData.get("listingId") || "");
  const status = String(formData.get("status") || "").toUpperCase();
  if (!z.string().uuid().safeParse(id).success || !Object.hasOwn(listingTransitions, status)) {
    return { error: "Oferta ou estado inválido." };
  }

  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return { error: "Sem autorização para moderar ofertas." };

  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 8 || reason.length > 500) return { error: "A justificação deve ter entre 8 e 500 caracteres." };
  const { error } = await supabase.rpc("admin_set_listing_status", {
    p_listing_id: id,
    p_new_status: status,
    p_reason: reason,
  });
  if (error) return { error: error.message.includes("INVALID_LISTING_STATUS_TRANSITION")
    ? "A transição solicitada não é permitida a partir do estado actual."
    : "Não foi possível moderar a oferta. Confirme o estado e tente novamente." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/marketplace");
  return { success: true };
}

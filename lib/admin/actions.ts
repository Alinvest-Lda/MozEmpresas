"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const listingStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "SOLD_OUT", "ARCHIVED"] as const;

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
  if (!z.string().uuid().safeParse(id).success || !listingStatuses.includes(status as typeof listingStatuses[number])) {
    return { error: "Oferta ou estado inválido." };
  }

  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return { error: "Sem autorização para moderar ofertas." };

  const { data: updatedListing, error } = await supabase
    .from("listings")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !updatedListing) return { error: "Não foi possível actualizar a oferta. Confirme se existe e tente novamente." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/marketplace");
  return { success: true };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export const MANAGER_ROLES = ["owner", "admin", "operator"] as const;

export async function getManagedBusinessIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from("businesses").select("id").eq("owner_id", userId).is("archived_at", null),
    supabase.from("business_members").select("business_id").eq("user_id", userId).in("role", [...MANAGER_ROLES]),
  ]);
  return [...new Set([...(owned ?? []).map((row) => row.id), ...(memberships ?? []).map((row) => row.business_id)])];
}

export async function canManageBusiness(supabase: SupabaseClient, userId: string, businessId: string): Promise<boolean> {
  const { data: owned } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .is("archived_at", null)
    .maybeSingle();
  if (owned) return true;

  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", [...MANAGER_ROLES])
    .maybeSingle();
  return Boolean(member);
}

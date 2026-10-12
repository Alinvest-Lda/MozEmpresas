import type { SupabaseClient } from "@supabase/supabase-js";

export const MANAGER_ROLES = ["owner", "admin", "operator"] as const;

export async function getManagedBusinessIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from("businesses").select("id").eq("owner_id", userId).is("archived_at", null),
    supabase.from("business_members").select("business_id").eq("user_id", userId).in("role", [...MANAGER_ROLES]),
  ]);
  const membershipIds = [...new Set((memberships ?? []).map((row) => row.business_id))];
  const { data: activeMembershipBusinesses } = membershipIds.length
    ? await supabase.from("businesses").select("id").in("id", membershipIds).is("archived_at", null)
    : { data: [] as { id: string }[] };
  return [...new Set([
    ...(owned ?? []).map((row) => row.id),
    ...(activeMembershipBusinesses ?? []).map((row) => row.id),
  ])];
}

export async function canManageBusiness(supabase: SupabaseClient, userId: string, businessId: string): Promise<boolean> {
  const { data: business } = await supabase
    .from("businesses")
    .select("id,owner_id")
    .eq("id", businessId)
    .is("archived_at", null)
    .maybeSingle();
  if (!business) return false;
  if (business.owner_id === userId) return true;
  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", [...MANAGER_ROLES])
    .maybeSingle();
  return Boolean(member);
}

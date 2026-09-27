import { createClient } from "@/lib/supabase/server";

export const BUSINESS_PERMISSIONS = [
  "company.view","company.manage","users.manage","products.manage","sales.manage",
  "purchase.manage","tenders.create","tenders.participate","opportunities.create",
  "opportunities.respond","partners.manage",
] as const;

export type BusinessPermission = typeof BUSINESS_PERMISSIONS[number];

export async function getBusinessAccess(userId: string, businessId: string) {
  const supabase = await createClient();
  const [{ data: business }, { data: member }] = await Promise.all([
    supabase.from("businesses").select("id,owner_id").eq("id", businessId).maybeSingle(),
    supabase.from("business_members").select("role").eq("business_id", businessId).eq("user_id", userId).maybeSingle(),
  ]);

  if (!business) return { role: null, permissions: [] as string[] };
  const role = business.owner_id === userId ? "owner" : member?.role ?? null;
  if (!role) return { role: null, permissions: [] as string[] };

  const { data: rows } = await supabase
    .from("business_role_permissions")
    .select("permission")
    .eq("role", role);

  return { role, permissions: (rows ?? []).map((row) => row.permission) };
}

export async function requireBusinessPermission(userId: string, businessId: string, permission: BusinessPermission) {
  const access = await getBusinessAccess(userId, businessId);
  if (!access.permissions.includes(permission)) throw new Error("Acesso não autorizado.");
  return access;
}

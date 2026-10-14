import { createClient } from "@/lib/supabase/server";

/**
 * Server-side gate for global platform administration.
 * Authorization fails closed if the user, membership, or role cannot be verified.
 */
export async function getSuperAdminContext() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, user: null, authorized: false };
  }

  const { data: member, error: memberError } = await supabase
    .from("platform_members")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    authorized: !memberError && member?.active === true && member.role === "super_admin",
  };
}

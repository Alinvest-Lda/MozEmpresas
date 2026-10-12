"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "operator", "member", "viewer"]),
});
const memberSchema = schema.pick({ businessId: true, userId: true });

async function manager(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  userId: string,
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();
  // Keep legacy profiles with an unset status consistent with the normal-account guard.
  if (profileError || !profile || (profile.account_status && profile.account_status !== "ACTIVE")) return false;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_id")
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
    .in("role", ["owner", "admin"])
    .maybeSingle();
  return Boolean(member);
}

export async function updateBusinessMemberRole(formData: FormData) {
  const parsed = schema.safeParse({
    businessId: formData.get("businessId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) redirect("/dashboard/acessos?status=invalid-request");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await manager(supabase, parsed.data.businessId, user.id))) {
    redirect("/dashboard/acessos?status=permission-denied");
  }
  if (user.id === parsed.data.userId) redirect("/dashboard/acessos?status=self-change-protected");

  const { data: current, error: currentError } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", parsed.data.businessId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (currentError || !current) redirect("/dashboard/acessos?status=member-not-found");
  if (current.role === "owner") redirect("/dashboard/acessos?status=owner-protected");

  const { error } = await supabase
    .from("business_members")
    .update({ role: parsed.data.role })
    .eq("business_id", parsed.data.businessId)
    .eq("user_id", parsed.data.userId)
    .neq("role", "owner");
  if (error) redirect("/dashboard/acessos?status=role-error");

  if (current.role !== parsed.data.role) {
    const { error: auditError } = await supabase.from("access_audit_log").insert({
      business_id: parsed.data.businessId,
      actor_user_id: user.id,
      target_user_id: parsed.data.userId,
      action: "ROLE_CHANGED",
      role_from: current.role,
      role_to: parsed.data.role,
      metadata: {},
    });
    revalidatePath("/dashboard/acessos?view=auditoria");
    if (auditError) redirect("/dashboard/acessos?status=role-updated-audit-warning");
  }

  revalidatePath("/dashboard/acessos");
  revalidatePath("/dashboard");
  redirect("/dashboard/acessos?status=role-updated");
}

export async function removeBusinessMember(formData: FormData) {
  const parsed = memberSchema.safeParse({
    businessId: formData.get("businessId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) redirect("/dashboard/acessos?status=invalid-request");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await manager(supabase, parsed.data.businessId, user.id))) {
    redirect("/dashboard/acessos?status=permission-denied");
  }
  if (user.id === parsed.data.userId) redirect("/dashboard/acessos?status=self-change-protected");

  const { data: member, error: memberError } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", parsed.data.businessId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (memberError || !member) redirect("/dashboard/acessos?status=member-not-found");
  if (member.role === "owner") redirect("/dashboard/acessos?status=owner-protected");

  const { error } = await supabase
    .from("business_members")
    .delete()
    .eq("business_id", parsed.data.businessId)
    .eq("user_id", parsed.data.userId);
  if (error) redirect("/dashboard/acessos?status=access-error");

  const { error: auditError } = await supabase.from("access_audit_log").insert({
    business_id: parsed.data.businessId,
    actor_user_id: user.id,
    target_user_id: parsed.data.userId,
    action: "ACCESS_REVOKED",
    role_from: member.role,
    role_to: null,
    metadata: {},
  });

  revalidatePath("/dashboard/acessos");
  revalidatePath("/dashboard");
  if (auditError) redirect("/dashboard/acessos?status=access-revoked-audit-warning");
  redirect("/dashboard/acessos?status=access-revoked");
}

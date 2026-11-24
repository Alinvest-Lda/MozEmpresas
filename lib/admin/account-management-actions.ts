"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/security/rate-limit";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const ACCOUNT_STATUSES = ["ACTIVE", "INACTIVE", "DELETED"] as const;

export async function setManagedAccountStatus(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const status = String(formData.get("status") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !ACCOUNT_STATUSES.includes(status as typeof ACCOUNT_STATUSES[number]) || reason.length < 8 || reason.length > 500) {
    redirect("/dashboard/admin/usuarios?result=invalid");
  }
  const { supabase, user, authorized } = await getSuperAdminContext();
  if (!authorized || !user) redirect("/login?next=/dashboard/admin/usuarios");
  if (user.id === userId) redirect("/dashboard/admin/usuarios?result=self");
  const admin = createAdminClient();
  if (!admin) redirect("/dashboard/admin/usuarios?result=service-unavailable");
  const { data: profile, error: readError } = await admin.from("profiles").select("account_status").eq("id", userId).maybeSingle();
  if (readError || !profile) redirect("/dashboard/admin/usuarios?result=not-found");
  const oldStatus = profile.account_status || "ACTIVE";
  if (oldStatus === status) redirect("/dashboard/admin/usuarios?result=unchanged");

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: status === "ACTIVE" ? "none" : "876000h",
  });
  if (authError) redirect("/dashboard/admin/usuarios?result=auth-update-failed");

  const { error } = await supabase.rpc("admin_set_account_status", {
    p_user_id: userId,
    p_status: status,
    p_reason: reason,
  });
  if (error) {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: oldStatus === "ACTIVE" ? "none" : "876000h",
    });
    const code = error.message.includes("LAST_ACTIVE_SUPER_ADMIN_PROTECTED") ? "last-admin" :
      error.message.includes("FORBIDDEN") ? "forbidden" : "update-failed";
    redirect("/dashboard/admin/usuarios?result=" + code);
  }
  revalidatePath("/dashboard/admin/usuarios");
  revalidatePath("/dashboard");
  redirect("/dashboard/admin/usuarios?result=updated");
}

export async function sendManagedPasswordRecovery(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/dashboard/admin/usuarios?result=invalid");
  }
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/usuarios");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profileError || !profile) redirect("/dashboard/admin/usuarios?result=not-found");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://moz-empresas.vercel.app";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin + "/auth/confirm?next=/redefinir-password",
  });
  if (error) redirect("/dashboard/admin/usuarios?result=recovery-failed");
  const { error: auditError } = await supabase.rpc("admin_record_password_recovery", { p_user_id: userId });
  revalidatePath("/dashboard/admin/usuarios");
  redirect("/dashboard/admin/usuarios?result=" + (auditError ? "recovery-audit-warning" : "recovery-sent"));
}

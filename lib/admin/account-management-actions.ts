"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const { error } = await supabase.rpc("admin_set_account_status", {
    p_user_id: userId,
    p_status: status,
    p_reason: reason,
  });
  if (error) {
    const code = error.message.includes("LAST_ACTIVE_SUPER_ADMIN_PROTECTED") ? "last-admin" :
      error.message.includes("FORBIDDEN") ? "forbidden" :
      error.message.includes("PROFILE_NOT_FOUND") ? "not-found" :
      error.message.includes("ACCOUNT_STATUS_UNCHANGED") ? "unchanged" : "update-failed";
    redirect("/dashboard/admin/usuarios?result=" + code);
  }
  revalidatePath("/dashboard/admin/usuarios");
  revalidatePath("/dashboard");
  redirect("/dashboard/admin/usuarios?result=updated");
}

export async function sendManagedPasswordRecovery(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) redirect("/dashboard/admin/usuarios?result=invalid");
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/usuarios");
  const { data: email, error: emailError } = await supabase.rpc("admin_get_user_email", { p_user_id: userId });
  if (emailError || typeof email !== "string" || !email) redirect("/dashboard/admin/usuarios?result=not-found");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://moz-empresas.vercel.app";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin + "/auth/confirm?next=/redefinir-password",
  });
  if (error) redirect("/dashboard/admin/usuarios?result=recovery-failed");
  const { error: auditError } = await supabase.rpc("admin_record_password_recovery", { p_user_id: userId });
  revalidatePath("/dashboard/admin/usuarios");
  redirect("/dashboard/admin/usuarios?result=" + (auditError ? "recovery-audit-warning" : "recovery-sent"));
}

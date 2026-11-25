"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

export async function setPlatformStaffActive(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const activeValue = String(formData.get("active") || "");
  const reason = String(formData.get("reason") || "").trim();
  const parsed = z.object({
    userId: z.string().uuid(),
    active: z.enum(["true", "false"]),
    reason: z.string().min(8).max(500),
  }).safeParse({ userId, active: activeValue, reason });
  if (!parsed.success) redirect("/dashboard/admin/usuarios?result=staff-invalid");

  const { supabase, user, authorized } = await getSuperAdminContext();
  if (!authorized || !user) redirect("/login?next=/dashboard/admin/usuarios");
  if (user.id === parsed.data.userId && parsed.data.active === "false") {
    redirect("/dashboard/admin/usuarios?result=staff-self");
  }

  const { error } = await supabase.rpc("admin_set_platform_staff_active", {
    p_user_id: parsed.data.userId,
    p_active: parsed.data.active === "true",
    p_reason: parsed.data.reason,
  });
  if (error) {
    const code = [
      "LAST_ACTIVE_SUPER_ADMIN_PROTECTED",
      "PLATFORM_STAFF_NOT_FOUND",
      "PLATFORM_STAFF_STATUS_UNCHANGED",
      "SELF_STAFF_REVOCATION_FORBIDDEN",
      "FORBIDDEN",
    ].find((value) => error.message.includes(value)) ?? "staff-update-failed";
    redirect("/dashboard/admin/usuarios?result=" + code);
  }

  revalidatePath("/dashboard/admin/usuarios");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  revalidatePath("/dashboard/admin/suporte");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin/usuarios?result=staff-updated");
}

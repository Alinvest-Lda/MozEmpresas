"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const schema = z.object({
  memberId: z.string().uuid(),
  reason: z.string().trim().min(8).max(500),
});

export async function revokePartnerPortalAccess(formData: FormData) {
  const parsed = schema.safeParse({
    memberId: formData.get("memberId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/dashboard/admin/parceiros?access=invalid");

  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/parceiros");

  const { error } = await supabase.rpc("admin_partner_access_revoke", {
    p_member_id: parsed.data.memberId,
    p_reason: parsed.data.reason,
  });
  if (error) {
    const code = error.message.includes("FORBIDDEN") ? "forbidden"
      : error.message.includes("PARTNER_ACCESS_NOT_FOUND") ? "not-found"
      : "revoke";
    redirect(`/dashboard/admin/parceiros?access=${code}`);
  }

  revalidatePath("/dashboard/admin/parceiros");
  revalidatePath("/parceiro");
  redirect("/dashboard/admin/parceiros?access=revoked");
}

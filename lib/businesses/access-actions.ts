"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "operator", "member", "viewer"]),
});

export async function updateBusinessMemberRole(formData: FormData) {
  const parsed = schema.safeParse({
    businessId: formData.get("businessId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", parsed.data.businessId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) return;

  const { data: currentMember } = await supabase.from("business_members").select("role").eq("business_id", parsed.data.businessId).eq("user_id", parsed.data.userId).maybeSingle();
  const { error: updateError } = await supabase
    .from("business_members")
    .update({ role: parsed.data.role })
    .eq("business_id", parsed.data.businessId)
    .eq("user_id", parsed.data.userId)
    .neq("role", "owner");
  if (!updateError && currentMember?.role && currentMember.role !== parsed.data.role) {
    await supabase.from("access_audit_log").insert({ business_id: parsed.data.businessId, actor_user_id: user.id, target_user_id: parsed.data.userId, action: "ROLE_CHANGED", role_from: currentMember.role, role_to: parsed.data.role, metadata: {} });
  }

  revalidatePath("/dashboard/acessos");
  revalidatePath("/dashboard");
}

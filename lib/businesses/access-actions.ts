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

  await supabase
    .from("business_members")
    .update({ role: parsed.data.role })
    .eq("business_id", parsed.data.businessId)
    .eq("user_id", parsed.data.userId)
    .neq("role", "owner");

  revalidatePath("/dashboard/acessos");
  revalidatePath("/dashboard");
}

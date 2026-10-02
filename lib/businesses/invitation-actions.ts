"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  businessId: z.string().uuid(),
  email: z.string().trim().email(),
  role: z.enum(["admin","operator","member","viewer"]),
});

export async function inviteBusinessMember(formData: FormData) {
  const parsed = schema.safeParse({
    businessId: formData.get("businessId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Dados do convite inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: business } = await supabase.from("businesses").select("id,name").eq("id", parsed.data.businessId).eq("owner_id", user.id).maybeSingle();
  if (!business) return { error: "Apenas o proprietário pode convidar membros nesta fase." };

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.from("business_invitations").insert({
    business_id: business.id, email: parsed.data.email.toLowerCase(), role: parsed.data.role,
    invited_by: user.id, token_hash: tokenHash,
  });
  if (error) return { error: "Não foi possível criar o convite." };\n  await supabase.from("access_audit_log").insert({ business_id: business.id, actor_user_id: user.id, target_user_id: null, action: "INVITE_SENT", role_from: null, role_to: parsed.data.role, metadata: { email: parsed.data.email.toLowerCase() } });

  revalidatePath("/dashboard/acessos");
  return { success: true, invitePath: "/convites/" + token };
}

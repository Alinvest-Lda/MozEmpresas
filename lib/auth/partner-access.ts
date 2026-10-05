"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type PartnerAccessState = { error?: string };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/parceiros");

  const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");
  if (!isSuperAdmin) redirect("/dashboard");
  return user;
}

const accessSchema = z.object({
  email: z.string().trim().email(),
  expiresInDays: z.coerce.number().int().min(1).max(30),
});

export async function createPartnerAccess(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const parsed = accessSchema.safeParse({
    email: formData.get("email"),
    expiresInDays: formData.get("expiresInDays") || 7,
  });
  if (!parsed.success) redirect("/admin/parceiros?error=validation");

  const supabase = await createClient();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86400000).toISOString();

  const { error } = await supabase.rpc("partner_access_create", {
    p_email: parsed.data.email,
    p_token_hash: hashToken(token),
    p_expires_at: expiresAt,
  });

  if (error) {
    if (error.message.includes("FORBIDDEN")) redirect("/admin/parceiros?error=forbidden");
    redirect("/admin/parceiros?error=create");
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const inviteUrl = `${origin}/parceiro/ativar?token=${token}`;
  redirect(`/admin/parceiros?created=1&access=${encodeURIComponent(inviteUrl)}`);
}

const activationSchema = z.object({
  token: z.string().min(32),
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(8),
});

export async function activatePartnerAccess(_state: PartnerAccessState, formData: FormData): Promise<PartnerAccessState> {
  const parsed = activationSchema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Preencha o nome e uma password com pelo menos 8 caracteres." };

  const supabase = await createClient();
  const { data: grant } = await supabase.rpc("partner_access_validate", {
    p_token_hash: hashToken(parsed.data.token),
  });
  const access = Array.isArray(grant) ? grant[0] : null;
  if (!access?.email) return { error: "Este acesso não é válido ou já expirou." };

  const { data, error } = await supabase.auth.signUp({
    email: access.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error || !data.user) return { error: "Não foi possível activar este acesso. Se a conta já existir, contacte o Super Admin." };

  const { error: claimError } = await supabase.rpc("partner_access_claim", {
    p_token_hash: hashToken(parsed.data.token),
    p_user_id: data.user.id,
  });
  if (claimError) return { error: "A conta foi criada, mas o acesso dedicado não pôde ser concluído. Contacte o Super Admin." };

  if (data.session) redirect("/parceiro");
  redirect("/login?registered=1");
}

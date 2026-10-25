"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const profileSchema = z.object({ fullName: z.string().trim().min(2).max(120), location: z.string().trim().max(160).optional(), website: z.string().trim().url().optional().or(z.literal("")), bio: z.string().trim().max(1000).optional() });
const passwordSchema = z.object({ password: z.string().min(8), confirmPassword: z.string().min(8) });

export type AccountState = { error?: string; success?: string };

async function verifyActiveProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return { ok: false as const, message: "Não foi possível verificar o perfil e o estado da conta." };
  }
  if (profile.account_status && profile.account_status !== "ACTIVE") {
    return { ok: false as const, message: "A sua conta não está activa. Reactive-a antes de alterar o perfil ou a password." };
  }
  return { ok: true as const };
}

export async function updateProfile(_state: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName"), location: formData.get("location") || "", website: formData.get("website") || "", bio: formData.get("bio") || "" });
  if (!parsed.success) return { error: "Verifique os dados do perfil." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await verifyActiveProfile(supabase, user.id);
  if (!access.ok) return { error: access.message };

  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName, location: parsed.data.location || null, website: parsed.data.website || null, bio: parsed.data.bio || null }).eq("id", user.id);
  if (error) return { error: "Não foi possível actualizar o perfil." };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/conta");
  return { success: "Dados pessoais actualizados." };
}

export async function updatePassword(_state: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success || parsed.data.password !== parsed.data.confirmPassword) return { error: "As passwords devem ter pelo menos 8 caracteres e ser iguais." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await verifyActiveProfile(supabase, user.id);
  if (!access.ok) return { error: access.message };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Não foi possível alterar a password." };
  return { success: "Password actualizada com sucesso." };
}

export async function updateAccountStatus(_state: AccountState, formData: FormData): Promise<AccountState> {
  const status = String(formData.get("status") || "");
  if (!["INACTIVE", "DELETED"].includes(status)) return { error: "A reactivação de contas exige revisão do suporte." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: currentProfile, error: profileReadError } = await supabase.from("profiles").select("account_status").eq("id", user.id).maybeSingle();
  if (profileReadError) return { error: "Não foi possível verificar o estado actual da conta." };
  if (!currentProfile) return { error: "Não foi possível localizar o perfil da conta. Contacte o suporte." };
  if (currentProfile.account_status === "DELETED" && status !== "DELETED") {
    return { error: "A conta já tem um pedido de eliminação. Contacte o suporte para rever este estado." };
  }
  const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", user.id);
  if (error) return { error: "Não foi possível actualizar o estado da conta." };
  revalidatePath("/dashboard/conta");
  revalidatePath("/conta/estado");
  revalidatePath("/dashboard");
  return { success: status === "INACTIVE" ? "Conta desactivada." : "Conta marcada para eliminação." };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const profileSchema = z.object({ fullName: z.string().trim().min(2).max(120), location: z.string().trim().max(160).optional(), website: z.string().trim().url().optional().or(z.literal("")), bio: z.string().trim().max(1000).optional() });
const passwordSchema = z.object({ password: z.string().min(8), confirmPassword: z.string().min(8) });

export type AccountState = { error?: string; success?: string };

export async function updateProfile(_state: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName"), location: formData.get("location") || "", website: formData.get("website") || "", bio: formData.get("bio") || "" });
  if (!parsed.success) return { error: "Verifique os dados do perfil." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: parsed.data.fullName, location: parsed.data.location || null, website: parsed.data.website || null, bio: parsed.data.bio || null }, { onConflict: "id" });
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
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Não foi possível alterar a password." };
  return { success: "Password actualizada com sucesso." };
}

export async function updateAccountStatus(_state: AccountState, formData: FormData): Promise<AccountState> {
  const status = String(formData.get("status") || "");
  if (!["ACTIVE", "INACTIVE", "DELETED"].includes(status)) return { error: "Estado de conta inválido." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", user.id);
  if (error) return { error: "Não foi possível actualizar o estado da conta." };
  revalidatePath("/dashboard/conta");
  return { success: status === "ACTIVE" ? "Conta activada." : status === "INACTIVE" ? "Conta desactivada." : "Conta marcada para eliminação." };
}

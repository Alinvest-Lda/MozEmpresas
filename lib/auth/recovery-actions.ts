"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type RecoveryState = { error?: string; success?: string };

const emailSchema = z.object({ email: z.string().trim().email() });
const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export async function requestPasswordReset(
  _state: RecoveryState,
  formData: FormData
): Promise<RecoveryState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Indique um endereço de email válido." };

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: "O serviço de autenticação está temporariamente indisponível." };
  }

  const requestHeaders = await headers();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    requestHeaders.get("origin") ||
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: new URL("/auth/confirm?next=/redefinir-password", baseUrl).toString(),
  });

  if (error) {
    return { error: "Não foi possível solicitar a recuperação. Tente novamente mais tarde." };
  }

  // Do not reveal whether an email is registered.
  return {
    success:
      "Se existir uma conta associada a esse email, receberá uma mensagem com os próximos passos. Verifique também a pasta de spam.",
  };
}

export async function setRecoveredPassword(
  _state: RecoveryState,
  formData: FormData
): Promise<RecoveryState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success || parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "As passwords devem ter pelo menos 8 caracteres e ser iguais." };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      error: "A sessão de recuperação não está válida ou expirou. Solicite um novo link.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Não foi possível actualizar a password. Solicite um novo link se este tiver expirado." };

  await supabase.auth.signOut();
  redirect("/login?passwordReset=1");
}

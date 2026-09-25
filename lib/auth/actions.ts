"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const registrationSchema = credentialsSchema.extend({ fullName: z.string().trim().min(2).max(120) });
export type AuthState = { error?: string };

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Indique um email válido e uma password com pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Não foi possível iniciar sessão. Verifique os seus dados." };
  redirect("/dashboard");
}
export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registrationSchema.safeParse({ fullName: formData.get("fullName"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Preencha nome, email e uma password com pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { full_name: parsed.data.fullName } } });
  if (error) return { error: "Não foi possível criar a conta. O email pode já estar registado." };
  if (data.session) redirect("/dashboard");
  redirect("/login?registered=1");
}
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

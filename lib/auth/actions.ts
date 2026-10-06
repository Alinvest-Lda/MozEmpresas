"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});
const registrationSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2).max(120),
});
export type AuthState = { error?: string };

async function createProfile(userId: string, fullName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert(
    { id: userId, full_name: fullName },
    { onConflict: "id" }
  );
  return !error;
}

function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function isPartnerPath(path: string | null): boolean {
  return Boolean(path && (path === "/parceiro" || path.startsWith("/parceiro/")));
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const requestedNext = safeNext(formData.get("next"));

  if (!parsed.success) {
    return { error: "Indique um email válido e uma password com pelo menos 8 caracteres." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: "O serviço de autenticação está temporariamente indisponível. Verifique a configuração do deployment." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Confirme primeiro o email da sua conta. Depois volte a entrar." };
    }
    return { error: "Não foi possível iniciar sessão. Verifique o email e a password." };
  }

  let profile: { full_name: string; user_type: string; account_status?: string } | null = null;

  if (data.user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("full_name,user_type,account_status")
      .eq("id", data.user.id)
      .maybeSingle();
    profile = existingProfile;
    await createProfile(
      data.user.id,
      profile?.full_name ||
        data.user.user_metadata?.full_name ||
        data.user.email?.split("@")[0] ||
        "Utilizador"
    );
  }

  if (profile?.account_status && profile.account_status !== "ACTIVE") {
    await supabase.auth.signOut();
    return { error: "Esta conta não está activa. Contacte o suporte para recuperar o acesso." };
  }

  let partner = false;
  try {
    const { data: partnerResult } = await supabase.rpc("is_partner_account");
    partner = partnerResult === true;
  } catch {
    partner = false;
  }

  const target: string = partner
    ? (isPartnerPath(requestedNext) && requestedNext ? requestedNext : "/parceiro")
    : (isPartnerPath(requestedNext) ? "/dashboard" : requestedNext || "/dashboard");

  redirect(target);
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registrationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Preencha o nome, um email válido e uma password com pelo menos 8 caracteres." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: "O serviço de autenticação está temporariamente indisponível. Verifique a configuração do deployment." };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("signup") && message.includes("disabled")) {
      return { error: "O registo de novos utilizadores está desactivado no projecto de autenticação." };
    }
    if (message.includes("redirect")) {
      return { error: "O endereço de confirmação do email ainda não está autorizado no projecto de autenticação." };
    }
    return { error: "Não foi possível criar a conta. Verifique o email e tente novamente." };
  }

  if (data.session && data.user) {
    await createProfile(data.user.id, parsed.data.fullName);
    redirect("/dashboard");
  }

  redirect("/login?registered=1");
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}
  revalidatePath("/", "layout");
  redirect("/");
}

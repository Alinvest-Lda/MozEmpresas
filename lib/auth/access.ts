import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountType = "empresa" | "profissional" | "parceiro";

function normalizeAccountType(value: unknown): Exclude<AccountType, "parceiro"> {
  return value === "profissional" ? "profissional" : "empresa";
}

export async function getCurrentAccountContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, accountType: null as AccountType | null, accountStatus: null as string | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type,account_status")
    .eq("id", user.id)
    .maybeSingle();

  let isPartner = false;
  try {
    const { data } = await supabase.rpc("is_partner_account");
    isPartner = data === true;
  } catch {
    isPartner = false;
  }

  return {
    supabase,
    user,
    accountType: isPartner ? "parceiro" as const : normalizeAccountType(profile?.user_type),
    accountStatus: profile?.account_status ?? "ACTIVE",
  };
}

export async function requireNormalAccount() {
  const context = await getCurrentAccountContext();
  if (!context.user) redirect("/login");
  if (context.accountType === "parceiro") redirect("/parceiro");
  if (context.accountStatus && context.accountStatus !== "ACTIVE") redirect("/login?inactive=1");
  return context;
}

export async function requirePartnerAccount() {
  const context = await getCurrentAccountContext();
  if (!context.user) redirect("/login?next=/parceiro");
  if (context.accountType !== "parceiro") redirect("/dashboard");
  if (context.accountStatus && context.accountStatus !== "ACTIVE") redirect("/login?inactive=1");

  const { data: partnerContext, error } = await context.supabase.rpc("partner_account_context");
  const account = Array.isArray(partnerContext) ? partnerContext[0] : null;

  if (error || !account || account.account_status !== "ACTIVE" || !account.member_role) {
    redirect("/dashboard");
  }

  return { ...context, partnerContext: account };
}

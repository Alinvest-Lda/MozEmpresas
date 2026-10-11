import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeDestination(value: string | null) {
  return value === "/redefinir-password" ? value : "/dashboard?confirmed=1";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") || "email") as EmailOtpType;
  const code = url.searchParams.get("code");
  const destination = safeDestination(url.searchParams.get("next"));

  const supabase = await createClient();
  let error: { message?: string } | null = null;

  if (tokenHash) {
    error = (await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    error = (await supabase.auth.exchangeCodeForSession(code)).error;
  } else {
    error = { message: "Missing confirmation token." };
  }

  if (error) {
    return NextResponse.redirect(new URL("/login?confirmed=error", url));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user && destination !== "/redefinir-password") {
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Utilizador",
    }, { onConflict: "id" });
  }

  return NextResponse.redirect(new URL(destination, url));
}

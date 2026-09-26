import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") || "email") as EmailOtpType;
  const code = url.searchParams.get("code");

  const supabase = await createClient();
  let error: { message?: string } | null = null;

  if (tokenHash) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    error = result.error;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else {
    error = { message: "Missing confirmation token." };
  }

  if (error) {
    return NextResponse.redirect(new URL("/login?confirmed=error", url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Utilizador",
      },
      { onConflict: "id" }
    );
  }

  return NextResponse.redirect(new URL("/dashboard?confirmed=1", url));
}

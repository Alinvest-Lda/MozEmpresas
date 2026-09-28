import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-moz-pathname", request.nextUrl.pathname);
  const requestWithPath = new NextRequest(request, { headers: requestHeaders });
  let response = NextResponse.next({ request: requestWithPath });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Auth remains inactive until the Supabase environment is configured.
  if (!supabaseUrl || !supabasePublishableKey) {
    console.error(
      "Supabase configuration missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(...args: Parameters<SetAllCookies>) {
          const [cookiesToSet] = args;

          cookiesToSet.forEach(({ name, value }) => {
            requestWithPath.cookies.set(name, value);
          });

          response = NextResponse.next({ request: requestWithPath });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getClaims();
  } catch (error) {
    console.error("Supabase middleware session refresh failed:", error);
  }

  return response;
}

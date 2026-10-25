import { createHash } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
  scope: string;
};

export async function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-forwarded-for")
    || request.headers.get("x-real-ip")
    || "unknown";
  const clientAddress = forwarded.split(",")[0].trim().slice(0, 128);
  const keyHash = createHash("sha256")
    .update(`${options.scope}:${clientAddress}`)
    .digest("hex");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { allowed: false, unavailable: true } as const;
  }

  const supabase = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("consume_public_rate_limit", {
    p_key_hash: keyHash,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });

  if (error || typeof data !== "boolean") {
    return { allowed: false, unavailable: true } as const;
  }
  return { allowed: data, unavailable: false } as const;
}

export function rateLimitResponse(unavailable = false) {
  return new Response(
    JSON.stringify({ error: unavailable ? "Protecção temporariamente indisponível." : "Demasiados pedidos. Tente novamente mais tarde." }),
    {
      status: unavailable ? 503 : 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...(unavailable ? {} : { "retry-after": "60" }),
        "cache-control": "no-store",
      },
    },
  );
}

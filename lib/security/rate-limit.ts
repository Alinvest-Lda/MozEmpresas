import { createHash } from "node:crypto";
import postgres from "postgres";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
  scope: string;
};

type PostgresClient = ReturnType<typeof postgres>;

let postgresClient: PostgresClient | null = null;

export function getPostgresClient(): PostgresClient | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!postgresClient) {
    postgresClient = postgres(connectionString, {
      max: 1,
      prepare: false,
      ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
      connect_timeout: 5,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connection: { application_name: "mozempresas-web" },
    });
  }

  return postgresClient;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function enforceRateLimit(request: Request, options: RateLimitOptions) {
  // Trust only the configured reverse-proxy header. Do not trust arbitrary
  // x-forwarded-for values supplied by clients on an unconfigured host.
  const trustedHeader = process.env.TRUSTED_CLIENT_IP_HEADER || "x-vercel-forwarded-for";
  const forwarded = request.headers.get(trustedHeader);
  const clientAddress = forwarded?.split(",")[0]?.trim().slice(0, 128) || "unknown";
  const keyHash = createHash("sha256")
    .update(`${options.scope}:${clientAddress}`)
    .digest("hex");

  try {
    const sql = getPostgresClient();
    if (sql) {
      const rows = await sql.unsafe(
        `insert into public.public_rate_limits(key_hash, window_started_at, request_count, updated_at)
         values ($1, now(), 1, now())
         on conflict (key_hash) do update set
           request_count = case
             when public.public_rate_limits.window_started_at <= now() - ($3 * interval '1 second') then 1
             else public.public_rate_limits.request_count + 1
           end,
           window_started_at = case
             when public.public_rate_limits.window_started_at <= now() - ($3 * interval '1 second') then now()
             else public.public_rate_limits.window_started_at
           end,
           updated_at = now()
         returning request_count`,
        [keyHash, options.limit, options.windowSeconds],
      );
      const count = Number(rows[0]?.request_count);
      return { allowed: Number.isFinite(count) && count <= options.limit, unavailable: false } as const;
    }

    const supabase = createAdminClient();
    if (!supabase) return { allowed: false, unavailable: true } as const;
    const { data, error } = await supabase.rpc("consume_public_rate_limit", {
      p_key_hash: keyHash,
      p_limit: options.limit,
      p_window_seconds: options.windowSeconds,
    });
    if (error || typeof data !== "boolean") {
      return { allowed: false, unavailable: true } as const;
    }
    return { allowed: data, unavailable: false } as const;
  } catch {
    return { allowed: false, unavailable: true } as const;
  }
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

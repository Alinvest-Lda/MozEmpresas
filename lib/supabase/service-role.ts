import { createClient } from "@supabase/supabase-js";

/**
 * Creates a server-only Supabase client for narrowly scoped privileged tasks.
 * Never import this module into Client Components or expose its key to a browser.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase server-side privileged credentials are not configured.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that uses the service role key. Bypasses RLS.
 * NEVER import this from a client component or from code that runs in the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing. " +
        "The admin client requires both."
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

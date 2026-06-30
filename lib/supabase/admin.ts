import "server-only";
import { createClient } from "@supabase/supabase-js";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/**
 * Service-role Supabase client — BYPASSES RLS. Server-only (the `server-only`
 * import makes it a build error to import this into a Client Component). Use
 * ONLY after verifying the caller's admin role; never expose to the browser.
 */
export function createSupabaseAdminClient() {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

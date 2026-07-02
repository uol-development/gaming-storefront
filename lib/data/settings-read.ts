import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, mergeSettings, type StoreSettings } from "@/lib/data/settings";

/**
 * Server-only store-settings reader. Uses a cookie-less anon client (the
 * "settings public read" RLS policy allows it) so it works in any server
 * context — layout, footer, checkout page, and the placeOrder action.
 *
 * RESILIENT BY DESIGN: any failure (missing table before the migration is run,
 * network error, malformed row) falls back to DEFAULT_SETTINGS, so the
 * storefront and the money path never break waiting on configuration.
 *
 * Wrapped in React `cache()` so multiple callers in one request share a single
 * DB round-trip.
 */
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return DEFAULT_SETTINGS;
  try {
    const supabase = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from("store_settings")
      .select("data")
      .eq("id", "default")
      .maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return mergeSettings((data as { data: unknown }).data);
  } catch {
    return DEFAULT_SETTINGS;
  }
});

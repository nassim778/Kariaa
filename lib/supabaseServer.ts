import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Returns a Supabase client if the project is configured via env vars,
 * otherwise `null` so callers can fall back to the bundled demo dataset.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

export const isSupabaseConfigured = Boolean(url && anonKey);

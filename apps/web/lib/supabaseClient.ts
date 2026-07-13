"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export const isSupabaseConfigured = env.isSupabaseConfigured;

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client with cookie-backed sessions (readable by middleware).
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  if (!client) {
    client = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return client;
}

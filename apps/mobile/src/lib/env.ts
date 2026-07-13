import Constants from "expo-constants";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

const isConfigured = Boolean(url && anonKey);
const isStoreBuild = !__DEV__;

/**
 * In release builds, missing Supabase config is a hard failure (no silent demo).
 * In __DEV__, demo mode is allowed when vars are empty.
 */
export function assertMobileEnv() {
  if (isStoreBuild && !isConfigured) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in this release build. Set EAS Secrets."
    );
  }
}

export const mobileEnv = {
  supabaseUrl: url || undefined,
  supabaseAnonKey: anonKey || undefined,
  isConfigured,
  isStoreBuild,
  appOwnership: Constants.appOwnership,
};

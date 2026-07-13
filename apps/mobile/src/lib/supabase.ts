import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * SecureStore has a ~2KB per-value limit which Supabase sessions can exceed,
 * so we chunk large values. On web (Expo web) SecureStore is unavailable, so
 * we fall back to AsyncStorage there.
 */
const CHUNK_SIZE = 2000;

const secureStoreAdapter = {
  getItem: async (key: string) => {
    const meta = await SecureStore.getItemAsync(key);
    if (meta === null) return null;
    const count = Number(meta);
    if (!Number.isFinite(count) || count <= 1) return meta === "1" ? "" : meta;
    let value = "";
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null;
      value += part;
    }
    return value;
  },
  setItem: async (key: string, value: string) => {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const count = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(key, String(count));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
  },
  removeItem: async (key: string) => {
    const meta = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key);
    const count = Number(meta);
    if (Number.isFinite(count) && count > 1) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
    }
  },
};

const storage = Platform.OS === "web" ? AsyncStorage : secureStoreAdapter;

let client: SupabaseClient | null = null;

/**
 * Supabase client (singleton) with a persisted, auto-refreshing session.
 * Returns null when the project isn't configured (demo mode).
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        storage: storage as never,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** Optional geocoding proxy base URL (a deployed Karia web app). */
export const geocodeProxyBaseUrl =
  process.env.EXPO_PUBLIC_GEOCODE_BASE_URL || undefined;

import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().or(z.literal("")),
});

function loadPublicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  });
  if (!parsed.success) {
    throw new Error(`Invalid public environment: ${parsed.error.message}`);
  }

  const url = parsed.data.NEXT_PUBLIC_SUPABASE_URL || undefined;
  const anonKey = parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;

  if (isProd && (!url || !anonKey)) {
    throw new Error(
      "Production requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  // Soft URL check when present
  if (url && !/^https?:\/\//.test(url)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be an http(s) URL");
  }

  return {
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
    isSupabaseConfigured: Boolean(url && anonKey),
    isProd,
  };
}

/** Safe for browser + server (no secrets). */
export const env = loadPublicEnv();

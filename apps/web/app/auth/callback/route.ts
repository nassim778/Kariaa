import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * PKCE auth callback: exchange ?code= for a session, then redirect.
 * Password recovery uses: /auth/callback?next=/reset-password
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { searchParams, origin } = url;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const fail = (errorCode: string) => {
    const dest = new URL("/reset-password", origin);
    dest.searchParams.set("error", errorCode);
    return NextResponse.redirect(dest);
  };

  if (!code) {
    const error =
      searchParams.get("error_code") ||
      searchParams.get("error") ||
      "missing_code";
    return fail(error);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return fail("config");

  const cookiesToSet: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookies) {
        cookiesToSet.push(...cookies);
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const codeName = /expired|invalid/i.test(error.message)
      ? "otp_expired"
      : "exchange_failed";
    return fail(codeName);
  }

  const dest = new URL(next, origin);
  if (next.startsWith("/reset-password")) {
    dest.searchParams.set("recovery", "1");
  }

  const res = NextResponse.redirect(dest);
  cookiesToSet.forEach(({ name, value, options }) =>
    res.cookies.set(name, value, options)
  );
  return res;
}

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function appOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

/**
 * PKCE auth callback: exchange ?code= for a session, then redirect.
 * Password recovery uses: /auth/callback?next=/reset-password
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = appOrigin(req);
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
    options: Parameters<NextResponse["cookies"]["set"]>[2];
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

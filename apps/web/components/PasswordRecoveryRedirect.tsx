"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/**
 * - Recovery session → /reset-password
 * - Auth errors dumped on / (Site URL fallback) → /reset-password?error=…
 */
export default function PasswordRecoveryRedirect() {
  const { passwordRecovery } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    const errorCode =
      params.get("error_code") ||
      params.get("error") ||
      hashParams.get("error_code") ||
      hashParams.get("error");

    if (
      errorCode &&
      pathname !== "/reset-password" &&
      pathname !== "/auth/callback"
    ) {
      router.replace(`/reset-password?error=${encodeURIComponent(errorCode)}`);
      return;
    }

    if (passwordRecovery && pathname !== "/reset-password") {
      router.replace("/reset-password?recovery=1");
    }
  }, [passwordRecovery, pathname, router]);

  return null;
}

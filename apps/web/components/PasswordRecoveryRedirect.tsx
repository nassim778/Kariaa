"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/** If an email recovery link lands on `/`, send the user to set a new password. */
export default function PasswordRecoveryRedirect() {
  const { passwordRecovery } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (passwordRecovery && pathname !== "/reset-password") {
      router.replace("/reset-password");
    }
  }, [passwordRecovery, pathname, router]);

  return null;
}

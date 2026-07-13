"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/LanguageProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";

/**
 * Landing page for email password-recovery links.
 * Supabase exchanges the link for a session and fires PASSWORD_RECOVERY;
 * we then require the user to set a new password (instead of just logging in).
 */
export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { passwordRecovery, clearPasswordRecovery, loading: authLoading, session } =
    useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    // Give the client a moment to process the URL hash / cookies from the link.
    const timer = setTimeout(() => {
      if (passwordRecovery || session) {
        setReady(true);
        setInvalid(false);
      } else {
        setReady(true);
        setInvalid(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [authLoading, passwordRecovery, session]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError(t("required_error"));
      return;
    }
    if (password !== confirm) {
      setError(t("reset_password_mismatch"));
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError(t("auth_unavailable"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      clearPasswordRecovery();
      setInfo(t("reset_password_done"));
      setTimeout(() => router.replace("/"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("generic_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size={36} />
          <span className="font-semibold text-brand">Karia</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <h1 className="text-2xl font-bold text-slate-900">
        {t("reset_password_title")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("reset_password_sub")}</p>

      {!ready || authLoading ? (
        <p className="mt-8 text-sm text-slate-500">{t("reset_recovery_wait")}</p>
      ) : invalid && !passwordRecovery && !session ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {t("reset_recovery_invalid")}
          </p>
          <Link href="/" className="inline-block text-sm font-medium text-brand">
            {t("back_home")}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {t("reset_new_password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {t("reset_confirm_password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-700">
              {info}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {t("reset_save_password")}
          </button>
        </form>
      )}
    </main>
  );
}

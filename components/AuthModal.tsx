"use client";

import { useState } from "react";
import Image from "next/image";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { BRAND } from "@/lib/brand";
import BrandLogo from "./BrandLogo";
import { useI18n } from "./LanguageProvider";

interface Props {
  onClose: () => void;
}

type Mode = "signin" | "signup";

export default function AuthModal({ onClose }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError(t("auth_unavailable"));
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          onClose();
        } else {
          setInfo(t("signup_confirm_email"));
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("generic_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="karia-scroll max-h-[90vh] w-full max-w-sm overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-28 shrink-0 overflow-hidden bg-slate-50">
          <Image
            src={BRAND.authIllustration}
            alt=""
            fill
            className="object-cover object-center"
          />
        </div>
        <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <BrandLogo size={32} />
          <h2 className="text-lg font-bold text-slate-800">
            {mode === "signin" ? t("signin_title") : t("signup_title")}
          </h2>
        </div>

        <p className="mb-4 text-xs text-slate-500">
          {mode === "signin" ? t("signin_sub") : t("signup_sub")}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {t("email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder={t("email_ph")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {t("password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="••••••••"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {mode === "signin" ? t("signin_btn") : t("signup_btn")}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500">
          {mode === "signin" ? (
            <>
              {t("no_account")}{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setInfo(null);
                }}
                className="font-medium text-brand hover:underline"
              >
                {t("create_account")}
              </button>
            </>
          ) : (
            <>
              {t("have_account")}{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setInfo(null);
                }}
                className="font-medium text-brand hover:underline"
              >
                {t("signin_btn")}
              </button>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

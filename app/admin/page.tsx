"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/components/LanguageProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { Profile } from "@/lib/profile";
import { Listing, sizeLabel } from "@/lib/types";
import { propertyTypeKey } from "@/lib/i18n";

type Tab = "listings" | "users";

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, configured } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [listRes, profRes] = await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, is_admin, created_at")
        .order("created_at", { ascending: false }),
    ]);
    setListings((listRes.data as Listing[]) ?? []);
    setProfiles((profRes.data as Profile[]) ?? []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const toggleActive = async (l: Listing) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const next = !(l.is_active ?? true);
    await supabase.from("listings").update({ is_active: next }).eq("id", l.id);
    load();
  };

  const deleteListing = async (l: Listing) => {
    if (!confirm(t("admin_delete_confirm"))) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.from("listings").delete().eq("id", l.id);
    load();
  };

  const toggleAdmin = async (p: Profile) => {
    if (p.id === user?.id) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase
      .from("profiles")
      .update({ is_admin: p.is_admin === 1 ? 0 : 1 })
      .eq("id", p.id);
    load();
  };

  const activeCount = listings.filter((l) => l.is_active !== false).length;
  const inactiveCount = listings.length - activeCount;

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!configured || !user || !isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">{t("admin_access_denied")}</p>
        <Link
          href="/"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          {t("admin_back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen-safe overflow-auto bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <BrandLogo size={36} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-slate-800">{t("admin_title")}</p>
              <p className="text-[11px] text-slate-400">{t("admin_sub")}</p>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher className="w-auto min-w-[6.5rem]" />
            <Link
              href="/"
              className="touch-manipulation rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 active:bg-slate-50"
            >
              {t("admin_back")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 pb-safe sm:py-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("admin_stats_listings")} value={listings.length} />
          <Stat label={t("admin_stats_active")} value={activeCount} />
          <Stat label={t("admin_stats_inactive")} value={inactiveCount} />
          <Stat label={t("admin_stats_users")} value={profiles.length} />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          {(["listings", "users"] as Tab[]).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === id
                  ? "bg-brand text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t(id === "listings" ? "admin_tab_listings" : "admin_tab_users")}
            </button>
          ))}
        </div>

        {tab === "listings" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="karia-scroll overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t("admin_col_title")}</th>
                    <th className="px-4 py-3">{t("admin_col_price")}</th>
                    <th className="px-4 py-3">{t("admin_col_status")}</th>
                    <th className="px-4 py-3">{t("admin_col_owner")}</th>
                    <th className="px-4 py-3">{t("admin_col_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{l.title}</p>
                        <p className="text-xs text-slate-400">
                          {t(propertyTypeKey(l.type))} · {sizeLabel(l)} ·{" "}
                          {l.delegation}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {l.price} {t("currency")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            l.is_active !== false
                              ? "bg-teal-100 text-teal-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {l.is_active !== false
                            ? t("admin_status_active")
                            : t("admin_status_inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {profiles.find((p) => p.id === l.owner_id)?.email ??
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleActive(l)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            {l.is_active !== false
                              ? t("admin_deactivate")
                              : t("admin_activate")}
                          </button>
                          <button
                            onClick={() => deleteListing(l)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            {t("admin_delete_listing")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="karia-scroll overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t("admin_col_email")}</th>
                    <th className="px-4 py-3">{t("admin_col_role")}</th>
                    <th className="px-4 py-3">{t("admin_col_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {p.email ?? p.id.slice(0, 8)}
                        {p.id === user.id && (
                          <span className="ml-1 text-xs text-slate-400">
                            {t("admin_you")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.is_admin === 1
                              ? "bg-slate-800 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.is_admin === 1
                            ? t("admin_role_admin")
                            : t("admin_role_user")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.id !== user.id && (
                          <button
                            onClick={() => toggleAdmin(p)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            {p.is_admin === 1
                              ? t("admin_remove_admin")
                              : t("admin_make_admin")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

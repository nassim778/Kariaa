"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/components/LanguageProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { Profile } from "@/lib/profile";
import { Listing, sizeLabel } from "@/lib/types";
import { propertyTypeKey } from "@/lib/i18n";

type Tab = "listings" | "users" | "reports";

type ListingReport = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  listing?: Pick<Listing, "id" | "title" | "is_active" | "price" | "delegation"> | null;
};

const PAGE_SIZE = 25;

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, configured } = useAuth();
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const currentTotal =
    tab === "listings"
      ? listings.length
      : tab === "users"
        ? profiles.length
        : reports.length;
  const hasMore = visibleCount < currentTotal;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, tab, visibleCount, listings.length, profiles.length, reports.length]);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [listRes, profRes, reportRes] = await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, is_admin, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("listing_reports")
        .select(
          "id, listing_id, reporter_id, reason, created_at, listing:listings(id, title, is_active, price, delegation)",
        )
        .order("created_at", { ascending: false }),
    ]);
    setListings((listRes.data as Listing[]) ?? []);
    setProfiles((profRes.data as Profile[]) ?? []);
    const rawReports = (reportRes.data as Array<
      ListingReport & {
        listing?: ListingReport["listing"] | ListingReport["listing"][];
      }
    >) ?? [];
    setReports(
      rawReports.map((r) => ({
        ...r,
        listing: Array.isArray(r.listing) ? r.listing[0] ?? null : r.listing ?? null,
      })),
    );
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const toggleActive = async (l: Listing | Pick<Listing, "id" | "is_active">) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const next = !(l.is_active ?? true);
    await supabase.from("listings").update({ is_active: next }).eq("id", l.id);
    load();
  };

  const deleteListing = async (id: string) => {
    if (!confirm(t("admin_delete_confirm"))) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.from("listings").delete().eq("id", id);
    load();
  };

  const dismissReport = async (id: string) => {
    if (!confirm(t("admin_dismiss_confirm"))) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.from("listing_reports").delete().eq("id", id);
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

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(
        locale === "tn" ? "ar-TN" : locale === "en" ? "en-GB" : "fr-FR",
        { dateStyle: "short", timeStyle: "short" },
      );
    } catch {
      return iso;
    }
  };

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
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label={t("admin_stats_listings")} value={listings.length} />
          <Stat label={t("admin_stats_active")} value={activeCount} />
          <Stat label={t("admin_stats_inactive")} value={inactiveCount} />
          <Stat label={t("admin_stats_users")} value={profiles.length} />
          <Stat label={t("admin_stats_reports")} value={reports.length} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["listings", "users", "reports"] as Tab[]).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === id
                  ? "bg-brand text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t(
                id === "listings"
                  ? "admin_tab_listings"
                  : id === "users"
                    ? "admin_tab_users"
                    : "admin_tab_reports",
              )}
              {id === "reports" && reports.length > 0 ? (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                  {reports.length}
                </span>
              ) : null}
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
                  {listings.slice(0, visibleCount).map((l) => (
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
                            onClick={() => deleteListing(l.id)}
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
            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center gap-2 border-t border-slate-100 py-4 text-xs text-slate-400"
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                {t("admin_loading_more")}
              </div>
            )}
          </div>
        ) : tab === "users" ? (
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
                  {profiles.slice(0, visibleCount).map((p) => (
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
            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center gap-2 border-t border-slate-100 py-4 text-xs text-slate-400"
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                {t("admin_loading_more")}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {reports.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                {t("admin_no_reports")}
              </p>
            ) : (
              <>
                <div className="karia-scroll overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t("admin_col_title")}</th>
                        <th className="px-4 py-3">{t("admin_col_reason")}</th>
                        <th className="px-4 py-3">{t("admin_col_reporter")}</th>
                        <th className="px-4 py-3">{t("admin_col_date")}</th>
                        <th className="px-4 py-3">{t("admin_col_actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reports.slice(0, visibleCount).map((r) => {
                        const listing = r.listing;
                        const reporterEmail =
                          profiles.find((p) => p.id === r.reporter_id)?.email ??
                          r.reporter_id.slice(0, 8);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">
                                {listing?.title ?? r.listing_id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-slate-400">
                                {listing
                                  ? `${listing.price} ${t("currency")} · ${listing.delegation ?? "—"}`
                                  : "—"}
                                {listing && (
                                  <span
                                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                      listing.is_active !== false
                                        ? "bg-teal-100 text-teal-700"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {listing.is_active !== false
                                      ? t("admin_status_active")
                                      : t("admin_status_inactive")}
                                  </span>
                                )}
                              </p>
                            </td>
                            <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                              {r.reason}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {reporterEmail}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                              {formatDate(r.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {listing && (
                                  <>
                                    <button
                                      onClick={() =>
                                        toggleActive({
                                          id: listing.id,
                                          is_active: listing.is_active,
                                        })
                                      }
                                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                                    >
                                      {listing.is_active !== false
                                        ? t("admin_deactivate")
                                        : t("admin_activate")}
                                    </button>
                                    <button
                                      onClick={() => deleteListing(listing.id)}
                                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                    >
                                      {t("admin_delete_listing")}
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => dismissReport(r.id)}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                                >
                                  {t("admin_dismiss_report")}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="flex items-center justify-center gap-2 border-t border-slate-100 py-4 text-xs text-slate-400"
                  >
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    {t("admin_loading_more")}
                  </div>
                )}
              </>
            )}
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

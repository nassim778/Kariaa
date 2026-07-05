"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import AddListingModal from "@/components/AddListingModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/components/LanguageProvider";
import { propertyTypeKey } from "@/lib/i18n";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { listingCoverOrPlaceholder } from "@/lib/listingImages";
import { Listing, sizeLabel } from "@/lib/types";

export default function MyListingsPage() {
  const { user, isAdmin, loading: authLoading, configured } = useAuth();
  const { t } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase || !user) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setListings((data as Listing[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  return (
    <div className="h-screen-safe overflow-auto bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <BrandLogo size={36} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-slate-800">{t("my_listings")}</p>
              <p className="text-[11px] text-slate-400">{t("owner_space")}</p>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher className="w-auto min-w-[6.5rem]" />
            {isAdmin && (
              <Link
                href="/admin"
                className="touch-manipulation rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700 active:bg-red-100"
              >
                {t("admin_space")}
              </Link>
            )}
            <Link
              href="/"
              className="touch-manipulation rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 active:bg-slate-50"
            >
              {t("back_to_map")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 pb-safe sm:py-6">
        {authLoading || loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : !configured ? (
          <Empty text={t("not_configured_manage")} />
        ) : !user ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="mb-4 text-sm text-slate-500">{t("login_to_manage")}</p>
            <button
              onClick={() => setShowAuth(true)}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              {t("login")}
            </button>
          </div>
        ) : listings.length === 0 ? (
          <Empty text={t("no_listings_yet")}>
            <Link
              href="/"
              className="mt-3 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              {t("add_listing")}
            </Link>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => {
              const cover = listingCoverOrPlaceholder(l);
              return (
              <div
                key={l.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative h-40 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover}
                    alt={l.title}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
                    {sizeLabel(l)}
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-brand">
                      {l.price} {t("currency")}
                    </span>
                    <span className="text-[11px] text-slate-400">{t("per_month")}</span>
                  </div>
                  <p className="truncate text-sm font-medium text-slate-800">
                    {l.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {t(propertyTypeKey(l.type))} · {l.bedrooms} {t("rooms_abbr")} ·{" "}
                    {l.area_sqm ?? "—"} m²
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {l.delegation}, {l.governorate}
                  </p>
                  <button
                    onClick={() => setEditing(l)}
                    className="mt-3 w-full rounded-lg border border-brand py-2 text-xs font-medium text-brand hover:bg-brand hover:text-white"
                  >
                    {t("edit_delete")}
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {editing && (
        <AddListingModal
          lat={editing.lat}
          lng={editing.lng}
          existing={editing}
          onClose={() => setEditing(null)}
          onCreated={load}
        />
      )}
    </div>
  );
}

function Empty({
  text,
  children,
}: {
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm text-slate-500">{text}</p>
      {children}
    </div>
  );
}

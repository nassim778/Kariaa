"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import MapView, { BASEMAPS, BasemapId } from "./MapView";
import PlaceSearch from "./PlaceSearch";
import FiltersBar from "./FiltersBar";
import Sidebar from "./Sidebar";
import AuthModal from "./AuthModal";
import AddListingModal from "./AddListingModal";
import ListingDetailModal from "./ListingDetailModal";
import KariaBrandBlock from "./KariaBrandBlock";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "./AuthProvider";
import { useI18n } from "./LanguageProvider";
import { BBox, Filters, GeoPlace, Listing } from "@/lib/types";

type PickPurpose = "poi" | "listing" | null;

export default function MapExplorer() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [poi, setPoi] = useState<GeoPlace | null>(null);
  const [radiusM, setRadiusM] = useState(2000);
  const [bbox, setBBox] = useState<BBox | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const [basemap, setBasemap] = useState<BasemapId>("voyager");
  const [pickPurpose, setPickPurpose] = useState<PickPurpose>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingListingLoc, setPendingListingLoc] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { user, isAdmin, configured, signOut } = useAuth();
  const { t } = useI18n();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userMenuOpen]);

  const buildQuery = useCallback((): string | null => {
    const p = new URLSearchParams();
    if (filters.minPrice !== undefined) p.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== undefined) p.set("maxPrice", String(filters.maxPrice));
    if (filters.minBeds !== undefined) p.set("minBeds", String(filters.minBeds));
    if (filters.types?.length) p.set("types", filters.types.join(","));

    if (poi) {
      p.set("centerLng", String(poi.lng));
      p.set("centerLat", String(poi.lat));
      p.set("radius", String(radiusM));
      return p.toString();
    }
    if (bbox) {
      p.set("minLng", String(bbox.minLng));
      p.set("minLat", String(bbox.minLat));
      p.set("maxLng", String(bbox.maxLng));
      p.set("maxLat", String(bbox.maxLat));
      return p.toString();
    }
    return null;
  }, [filters, poi, radiusM, bbox]);

  useEffect(() => {
    const qs = buildQuery();
    if (qs === null) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/listings?${qs}`);
        const data = await res.json();
        setListings(data.listings ?? []);
      } catch {
        setListings([]);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
    // refreshKey forces a refetch after a new listing is created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQuery, refreshKey]);

  const handleSelectPlace = (place: GeoPlace) => {
    setPoi(place);
    setActiveId(null);
    setPickPurpose(null);
    setNavExpanded(false);
    setFiltersExpanded(false);
  };

  const handleMapPick = (lng: number, lat: number) => {
    if (pickPurpose === "listing") {
      setPendingListingLoc({ lat, lng });
    } else {
      setPoi({
        name: t("selected_point", { lat: lat.toFixed(4), lng: lng.toFixed(4) }),
        lat,
        lng,
        fit: false,
      });
      setActiveId(null);
    }
    setPickPurpose(null);
  };

  const startAddListing = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setPickPurpose("listing");
  };

  const handleListingClick = (id: string) => {
    setActiveId(id);
    setDetailId(id);
  };

  const closeDetail = () => {
    setDetailId(null);
    setActiveId(null);
  };

  const detailListing =
    detailId != null ? listings.find((l) => l.id === detailId) ?? null : null;

  const openAuth = () => {
    if (configured) setShowAuth(true);
    else alert(t("auth_needed_alert"));
  };

  const collapseMobileNav = () => {
    setNavExpanded(false);
    setFiltersExpanded(false);
  };

  const rentAuthControls = () => (
    <>
      <p
        className="text-[11px] font-medium leading-snug text-slate-700"
        dir="rtl"
        lang="ar"
      >
        عندك دار للكراء ؟
      </p>
      {user ? (
        <div ref={userMenuRef} className="group relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex min-w-[7.5rem] touch-manipulation items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition active:bg-slate-50 sm:hover:bg-slate-50"
            aria-label={t("account")}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-bold">
              {user.email?.[0]?.toUpperCase() ?? "U"}
            </span>
            <span className="max-w-[5.5rem] truncate">{user.email}</span>
          </button>
          <div
            className={`absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-lg transition ${
              userMenuOpen
                ? "visible opacity-100"
                : "invisible opacity-0 group-hover:visible group-hover:opacity-100"
            }`}
          >
            <p className="truncate px-2 py-1 text-[11px] text-slate-400">
              {user.email}
            </p>
            <button
              onClick={() => {
                setUserMenuOpen(false);
                signOut();
              }}
              className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openAuth}
          className="w-full min-w-[7.5rem] touch-manipulation rounded-xl border border-brand px-3 py-2 text-xs font-medium text-brand transition active:bg-brand active:text-white sm:hover:bg-brand sm:hover:text-white"
        >
          {t("login")}
        </button>
      )}
    </>
  );

  return (
    <div className="relative h-screen-safe w-screen overflow-hidden [--karia-topbar:8.25rem]">
      <MapView
        listings={listings}
        activeId={activeId}
        poi={poi}
        radiusM={radiusM}
        basemap={basemap}
        pickMode={pickPurpose !== null}
        onActiveChange={setActiveId}
        onListingClick={handleListingClick}
        onBBoxChange={setBBox}
        onMapPick={handleMapPick}
      />

      {/* Brand + language — desktop top left */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 hidden sm:left-4 sm:top-4 sm:block">
        <div className="pointer-events-auto rounded-2xl bg-white/90 p-2.5 shadow-lg backdrop-blur">
          <KariaBrandBlock />
        </div>
      </div>

      {/* Rent CTA + auth — desktop top right */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 hidden sm:right-4 sm:top-4 sm:block">
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 rounded-2xl bg-white/90 px-3 py-2.5 shadow-lg backdrop-blur">
          {rentAuthControls()}
        </div>
      </div>

      {/* Mobile — slim header + collapsible search */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 sm:hidden">
        <div className="pointer-events-auto bg-gradient-to-b from-white/95 via-white/90 to-transparent px-3 pb-2 pt-safe backdrop-blur">
          <div className="flex items-center gap-2">
            <BrandLogo size={32} />
            <LanguageSwitcher className="ml-auto w-auto" />
          </div>

          {!navExpanded ? (
            <button
              type="button"
              onClick={() => setNavExpanded(true)}
              className="mt-2 flex w-full touch-manipulation items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3.5 py-2.5 text-left shadow-sm active:bg-slate-50"
            >
              <svg
                className="h-4 w-4 shrink-0 text-brand"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-400">
                {t("search_tap")}
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {t("filters")}
              </span>
            </button>
          ) : (
            <div className="mt-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {t("search_tap")}
                </span>
                <button
                  type="button"
                  onClick={collapseMobileNav}
                  className="grid h-7 w-7 touch-manipulation place-items-center rounded-full text-slate-400 active:bg-slate-100"
                  aria-label={t("hide")}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <PlaceSearch onSelect={handleSelectPlace} />
              <button
                type="button"
                onClick={() =>
                  setPickPurpose((p) => (p === "poi" ? null : "poi"))
                }
                className={`mt-2 flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition active:scale-[0.98] ${
                  pickPurpose === "poi"
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                {pickPurpose === "poi" ? t("clicking_map") : t("point_on_map")}
              </button>
              <button
                type="button"
                onClick={() => setFiltersExpanded((v) => !v)}
                className="mt-2 flex w-full touch-manipulation items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-600 active:bg-slate-100"
              >
                <span>{t("filters")}</span>
                <svg
                  className={`h-4 w-4 transition ${filtersExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {filtersExpanded && (
                <div className="mt-2">
                  <FiltersBar
                    filters={filters}
                    onChange={setFilters}
                    radiusM={radiusM}
                    onRadiusChange={setRadiusM}
                    poiActive={!!poi}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {navExpanded && (
        <button
          type="button"
          aria-label={t("hide")}
          onClick={collapseMobileNav}
          className="fixed inset-0 z-[15] bg-black/20 sm:hidden"
        />
      )}

      {/* Desktop top control bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 hidden px-3 pt-safe sm:block sm:p-4 sm:pl-44 sm:pr-44 sm:pt-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <PlaceSearch onSelect={handleSelectPlace} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() =>
                  setPickPurpose((p) => (p === "poi" ? null : "poi"))
                }
                title={t("radius_hint")}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  pickPurpose === "poi"
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                <span>
                  {pickPurpose === "poi" ? t("clicking_map") : t("point_on_map")}
                </span>
              </button>

              {user && (
                <button
                  onClick={startAddListing}
                  className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-dark"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>{t("add_listing")}</span>
                </button>
              )}
            </div>
          </div>

          <FiltersBar
            filters={filters}
            onChange={setFilters}
            radiusM={radiusM}
            onRadiusChange={setRadiusM}
            poiActive={!!poi}
          />
        </div>
      </div>

      {/* Basemap switcher */}
      <div className="absolute bottom-[var(--karia-mobile-nav)] left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2 sm:bottom-4 sm:left-4">
        <div className="karia-scroll flex max-w-full overflow-x-auto rounded-full bg-white/95 p-1 shadow backdrop-blur">
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              onClick={() => setBasemap(id)}
              className={`shrink-0 touch-manipulation rounded-full px-3 py-1.5 text-[11px] font-medium transition active:scale-95 ${
                basemap === id
                  ? "bg-brand text-white"
                  : "text-slate-600 active:bg-slate-100"
              }`}
            >
              {t(`basemap_${id}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile backdrop when listings sheet is open */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t("hide")}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[9] bg-black/25 sm:hidden"
        />
      )}

      {/* Sidebar (listings) — bottom sheet on mobile, right panel on desktop */}
      <div
        className={`fixed inset-x-0 bottom-[var(--karia-mobile-nav)] z-20 flex h-[min(65dvh,520px)] flex-col transition-transform duration-300 ease-out sm:absolute sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-[var(--karia-topbar)] sm:h-auto sm:max-h-none sm:w-[380px] ${
          sidebarOpen
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        <div className="karia-sheet flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-none sm:rounded-tl-2xl">
          <Sidebar
            listings={listings}
            activeId={activeId}
            onActiveChange={setActiveId}
            onListingClick={handleListingClick}
            poi={poi}
            radiusM={radiusM}
            onClearPoi={() => setPoi(null)}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Toggle sidebar — desktop only */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className={`absolute top-1/2 z-20 hidden -translate-y-1/2 rounded-l-xl bg-brand px-2 py-4 text-xs font-medium text-white shadow-lg transition-all hover:bg-brand-dark sm:block ${
          sidebarOpen ? "right-[380px]" : "right-0"
        }`}
        style={{ writingMode: "vertical-rl" }}
        aria-label={sidebarOpen ? t("hide") : t("list_count", { count: listings.length })}
      >
        {sidebarOpen ? t("hide") : t("list_count", { count: listings.length })}
      </button>

      {pickPurpose === "listing" && (
        <div
          className={`pointer-events-none absolute left-1/2 z-30 max-w-[calc(100%-2rem)] -translate-x-1/2 sm:top-28 ${
            navExpanded
              ? "top-[calc(var(--safe-top)+12rem)]"
              : "top-[calc(var(--safe-top)+4.5rem)]"
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            <span className="truncate">{t("listing_banner")}</span>
            <button
              onClick={() => setPickPurpose(null)}
              className="shrink-0 touch-manipulation rounded-full bg-white/20 px-2.5 py-1 text-xs active:bg-white/30"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {user && (
        <div className="absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1 sm:flex">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center rounded-r-xl bg-red-700 px-2 py-4 text-xs font-medium text-white shadow-lg transition hover:bg-red-800"
              style={{ writingMode: "vertical-rl" }}
              title={t("admin_title")}
            >
              {t("admin_space")}
            </Link>
          )}
          <Link
            href="/mes-annonces"
            className="flex items-center rounded-r-xl bg-slate-800 px-2 py-4 text-xs font-medium text-white shadow-lg transition hover:bg-slate-900"
            style={{ writingMode: "vertical-rl" }}
            title={t("manage_listings_title")}
          >
            {t("my_listings")}
          </Link>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-200/90 bg-white/95 px-2 pb-safe pt-1.5 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex min-h-[44px] min-w-[4.5rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-medium text-slate-600 active:bg-slate-100"
        >
          <svg className="h-5 w-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          <span>{t("list_count", { count: listings.length })}</span>
        </button>

        <button
          type="button"
          onClick={startAddListing}
          className="flex min-h-[44px] min-w-[4.5rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-medium text-brand active:bg-brand/10"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white shadow-md">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span>{t("add_listing")}</span>
        </button>

        {user ? (
          <>
            <Link
              href="/mes-annonces"
              className="flex min-h-[44px] min-w-[4.5rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-medium text-slate-600 active:bg-slate-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>{t("my_listings")}</span>
            </Link>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex min-h-[44px] min-w-[4.5rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-medium text-slate-600 active:bg-slate-100"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </span>
              <span>{t("account")}</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={openAuth}
            className="flex min-h-[44px] min-w-[4.5rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-medium text-brand active:bg-brand/10"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{t("login")}</span>
          </button>
        )}
      </nav>

      {/* Mobile account menu overlay */}
      {userMenuOpen && user && (
        <>
          <button
            type="button"
            aria-label={t("hide")}
            className="fixed inset-0 z-[35] sm:hidden"
            onClick={() => setUserMenuOpen(false)}
          />
          <div className="fixed inset-x-3 bottom-[calc(var(--karia-mobile-nav)+0.5rem)] z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:hidden">
          <p className="truncate px-3 py-2 text-xs text-slate-400">{user.email}</p>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setUserMenuOpen(false)}
              className="block w-full touch-manipulation rounded-xl px-3 py-3 text-left text-sm text-red-700 active:bg-red-50"
            >
              {t("admin_space")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(false);
              signOut();
            }}
            className="w-full touch-manipulation rounded-xl px-3 py-3 text-left text-sm text-slate-700 active:bg-slate-50"
          >
            {t("logout")}
          </button>
        </div>
        </>
      )}

      {/* Modals */}
      {detailListing && (
        <ListingDetailModal
          listing={detailListing}
          currentUserId={user?.id ?? null}
          onClose={closeDetail}
          onEdit={() => {
            setDetailId(null);
            setEditingListing(detailListing);
          }}
        />
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {pendingListingLoc && (
        <AddListingModal
          lat={pendingListingLoc.lat}
          lng={pendingListingLoc.lng}
          onClose={() => setPendingListingLoc(null)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {editingListing && (
        <AddListingModal
          lat={editingListing.lat}
          lng={editingListing.lng}
          existing={editingListing}
          onClose={() => setEditingListing(null)}
          onCreated={() => {
            setEditingListing(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

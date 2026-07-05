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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  return (
    <div className="relative h-screen w-screen overflow-hidden [--karia-topbar:10.5rem] sm:[--karia-topbar:8.25rem]">
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

      {/* Brand + language — top left */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <div className="pointer-events-auto rounded-2xl bg-white/90 p-2.5 shadow-lg backdrop-blur">
          <KariaBrandBlock />
        </div>
      </div>

      {/* Top control bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 pt-[5.75rem] sm:p-4 sm:pt-4 sm:pl-44">
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2 rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <PlaceSearch onSelect={handleSelectPlace} />
            </div>
            <button
              onClick={() =>
                setPickPurpose((p) => (p === "poi" ? null : "poi"))
              }
              title={t("radius_hint")}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                pickPurpose === "poi"
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              <span className="hidden sm:inline">
                {pickPurpose === "poi" ? t("clicking_map") : t("point_on_map")}
              </span>
            </button>

            {/* Auth / add listing */}
            {user ? (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={startAddListing}
                  className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-dark"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="hidden sm:inline">{t("add_listing")}</span>
                </button>
                <div className="group relative">
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {user.email?.[0]?.toUpperCase() ?? "U"}
                  </button>
                  <div className="invisible absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-slate-100 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                    <p className="truncate px-2 py-1 text-[11px] text-slate-400">
                      {user.email}
                    </p>
                    <button
                      onClick={() => signOut()}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
                    >
                      {t("logout")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() =>
                  configured
                    ? setShowAuth(true)
                    : alert(t("auth_needed_alert"))
                }
                className="shrink-0 rounded-xl border border-brand px-3 py-2 text-xs font-medium text-brand transition hover:bg-brand hover:text-white"
              >
                {t("login")}
              </button>
            )}
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
      <div className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-2">
        <div className="flex overflow-hidden rounded-full bg-white/90 p-1 shadow backdrop-blur">
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              onClick={() => setBasemap(id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                basemap === id
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t(`basemap_${id}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar (listings) — starts below top controls */}
      <div
        className={`absolute bottom-0 right-0 top-[var(--karia-topbar)] z-10 w-full transition-transform sm:w-[380px] ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full overflow-hidden rounded-tl-2xl bg-white shadow-2xl">
          <div className="hidden h-full sm:block">
            <Sidebar
              listings={listings}
              activeId={activeId}
              onActiveChange={setActiveId}
              onListingClick={handleListingClick}
              poi={poi}
              radiusM={radiusM}
              onClearPoi={() => setPoi(null)}
            />
          </div>
          <div className="flex h-full flex-col sm:hidden">
            <Sidebar
              listings={listings}
              activeId={activeId}
              onActiveChange={setActiveId}
              onListingClick={handleListingClick}
              poi={poi}
              radiusM={radiusM}
              onClearPoi={() => setPoi(null)}
            />
          </div>
        </div>
      </div>

      {/* Toggle sidebar — sits on the left edge of the panel */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className={`absolute top-1/2 z-20 -translate-y-1/2 rounded-l-xl bg-brand px-2 py-4 text-xs font-medium text-white shadow-lg transition-all hover:bg-brand-dark ${
          sidebarOpen ? "right-0 sm:right-[380px]" : "right-0"
        }`}
        style={{ writingMode: "vertical-rl" }}
        aria-label={sidebarOpen ? t("hide") : t("list_count", { count: listings.length })}
      >
        {sidebarOpen ? t("hide") : t("list_count", { count: listings.length })}
      </button>

      {pickPurpose === "listing" && (
        <div className="pointer-events-none absolute left-1/2 top-28 z-30 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-lg">
            {t("listing_banner")}
            <button
              onClick={() => setPickPurpose(null)}
              className="rounded-full bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {user && (
        <div className="absolute left-0 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1">
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

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_LISTINGS, haversine } from "./demoListings";
import { Filters, GeoPlace, Listing, PropertyType } from "./types";
import { Locale } from "./i18n";
import { acceptLanguageFor, localeToNominatimLang } from "./nominatimLang";

const NOMINATIM_UA = "Karia-RealEstate/0.1 (map rental platform, Tunisia)";

export interface ListingSearchParams {
  filters?: Filters;
  /** Radius search around a point (metres). Takes precedence over bbox. */
  center?: { lat: number; lng: number; radiusM: number };
  /** Viewport search. */
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
}

export interface ListingSearchResult {
  listings: Listing[];
  source: "supabase" | "demo";
  error?: string;
}

/**
 * Fetch listings for a radius or viewport search.
 * Demo data is used only when no Supabase client is configured (local
 * zero-config). If a client exists and the query fails, the error is
 * rethrown — never silently replaced with demo listings.
 */
export async function searchListings(
  supabase: SupabaseClient | null,
  params: ListingSearchParams
): Promise<ListingSearchResult> {
  const { filters = {}, center, bbox } = params;
  const minPrice = filters.minPrice;
  const maxPrice = filters.maxPrice;
  const minBeds = filters.minBeds;
  const types = filters.types?.length ? filters.types : undefined;

  if (!supabase) {
    return { listings: demoSearch(params), source: "demo" };
  }

  if (center) {
    const { data, error } = await supabase.rpc("listings_in_radius", {
      center_lng: center.lng,
      center_lat: center.lat,
      radius_m: center.radiusM,
      min_price: minPrice ?? null,
      max_price: maxPrice ?? null,
      types: types ?? null,
      min_beds: minBeds ?? null,
    });
    if (error) throw error;
    return { listings: (data as Listing[]) ?? [], source: "supabase" };
  }
  if (bbox) {
    const { data, error } = await supabase.rpc("listings_in_bbox", {
      min_lng: bbox.minLng,
      min_lat: bbox.minLat,
      max_lng: bbox.maxLng,
      max_lat: bbox.maxLat,
      min_price: minPrice ?? null,
      max_price: maxPrice ?? null,
      types: types ?? null,
      min_beds: minBeds ?? null,
    });
    if (error) throw error;
    return { listings: (data as Listing[]) ?? [], source: "supabase" };
  }
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("is_active", true)
    .limit(500);
  if (error) throw error;
  return { listings: (data as Listing[]) ?? [], source: "supabase" };
}

function demoSearch(params: ListingSearchParams): Listing[] {
  const { filters = {}, center, bbox } = params;
  const { minPrice, maxPrice, minBeds, types } = filters;

  const passesFilters = (l: Listing) =>
    (minPrice === undefined || l.price >= minPrice) &&
    (maxPrice === undefined || l.price <= maxPrice) &&
    (minBeds === undefined || l.bedrooms >= minBeds) &&
    (!types?.length || types.includes(l.type));

  if (center) {
    return DEMO_LISTINGS.filter(passesFilters)
      .map((l) => ({
        ...l,
        distance_m: haversine(center.lat, center.lng, l.lat, l.lng),
      }))
      .filter((l) => (l.distance_m as number) <= center.radiusM)
      .sort((a, b) => (a.distance_m as number) - (b.distance_m as number));
  }
  if (bbox) {
    return DEMO_LISTINGS.filter(passesFilters).filter(
      (l) =>
        l.lng >= bbox.minLng &&
        l.lng <= bbox.maxLng &&
        l.lat >= bbox.minLat &&
        l.lat <= bbox.maxLat
    );
  }
  return DEMO_LISTINGS.filter(passesFilters);
}

// --- Geocoding ------------------------------------------------------------

export interface GeocodeOptions {
  /**
   * Base URL of a deployed Karia web app to use its `/api/geocode` proxy
   * (respects Nominatim usage policy + caching). When omitted, Nominatim is
   * called directly from the device.
   */
  proxyBaseUrl?: string;
}

/** Forward geocode a place query, Tunisia-scoped. Mirrors `/api/geocode`. */
export async function geocodeSearch(
  query: string,
  locale: Locale,
  opts: GeocodeOptions = {}
): Promise<GeoPlace[]> {
  const q = query.trim();
  if (!q) return [];

  if (opts.proxyBaseUrl) {
    try {
      const res = await fetch(
        `${opts.proxyBaseUrl}/api/geocode?q=${encodeURIComponent(q)}&lang=${locale}`
      );
      const data = await res.json();
      return (data.places as GeoPlace[]) ?? [];
    } catch {
      return [];
    }
  }

  const nominatimLang = localeToNominatimLang(locale);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "tn");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("accept-language", nominatimLang);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": NOMINATIM_UA,
        "Accept-Language": acceptLanguageFor(locale),
      },
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      name?: string;
      namedetails?: { name?: string; "name:ar"?: string; "name:fr"?: string };
    }>;

    return data.map((d) => {
      const hasArabicQuery = /[\u0600-\u06FF]/.test(q);
      const arName = d.namedetails?.["name:ar"];
      const shortName = hasArabicQuery && arName ? arName : d.name;
      const name =
        shortName && d.display_name.startsWith(shortName)
          ? d.display_name
          : shortName
            ? `${shortName}, ${d.display_name.split(",").slice(1).join(",").trim()}`
            : d.display_name;
      return {
        name: name.replace(/,\s*$/, ""),
        lat: Number(d.lat),
        lng: Number(d.lon),
        type: d.type,
      };
    });
  } catch (e) {
    throw e instanceof Error ? e : new Error("Geocode failed");
  }
}

export interface ReverseGeocodeResult {
  governorate: string | null;
  delegation: string | null;
  address: string | null;
}

interface NominatimAddress {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  municipality?: string;
  town?: string;
  village?: string;
  city?: string;
  county?: string;
  state_district?: string;
  state?: string;
  region?: string;
  postcode?: string;
}

function cleanGovernorate(v?: string): string | null {
  if (!v) return null;
  return v
    .replace(/Gouvernorat de l['’]/i, "")
    .replace(/Gouvernorat de la /i, "")
    .replace(/Gouvernorat de /i, "")
    .replace(/Gouvernorat d['’]/i, "")
    .replace(/Gouvernorat /i, "")
    .replace(/ Governorate/i, "")
    .replace(/ولاية /i, "")
    .trim();
}

/** Reverse geocode a map point. Mirrors `/api/reverse-geocode`. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  locale: Locale,
  opts: GeocodeOptions = {}
): Promise<ReverseGeocodeResult> {
  const empty: ReverseGeocodeResult = {
    governorate: null,
    delegation: null,
    address: null,
  };

  if (opts.proxyBaseUrl) {
    try {
      const res = await fetch(
        `${opts.proxyBaseUrl}/api/reverse-geocode?lat=${lat}&lng=${lng}&lang=${locale}`
      );
      return (await res.json()) as ReverseGeocodeResult;
    } catch {
      return empty;
    }
  }

  const nominatimLang = localeToNominatimLang(locale);
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", nominatimLang);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": NOMINATIM_UA,
        "Accept-Language": acceptLanguageFor(locale),
      },
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = (await res.json()) as {
      address?: NominatimAddress;
      display_name?: string;
    };
    const a = data.address ?? {};
    const governorate = cleanGovernorate(a.state ?? a.region);
    const delegation =
      a.county ||
      a.city_district ||
      a.municipality ||
      a.town ||
      a.city ||
      a.suburb ||
      a.village ||
      null;
    const address =
      [a.road, a.neighbourhood || a.quarter || a.suburb]
        .filter(Boolean)
        .join(", ") ||
      data.display_name?.split(",").slice(0, 2).join(", ") ||
      null;
    return { governorate, delegation, address };
  } catch (e) {
    throw e instanceof Error ? e : new Error("Reverse geocode failed");
  }
}

export type { PropertyType };

import {
  DEMO_LISTINGS,
  geocodeSearch,
  reverseGeocode,
  searchListings,
  type GeoPlace,
  type Listing,
  type ListingSearchParams,
  type ListingSearchResult,
  type Locale,
  type ReverseGeocodeResult,
} from "@karia/shared";
import { geocodeProxyBaseUrl, getSupabase } from "./supabase";

export function fetchListings(
  params: ListingSearchParams
): Promise<ListingSearchResult> {
  // Cast: the shared package resolves its own @supabase/supabase-js type copy,
  // which is nominally distinct from the app's copy though structurally equal.
  return searchListings(getSupabase() as never, params);
}

export function searchPlaces(query: string, locale: Locale): Promise<GeoPlace[]> {
  return geocodeSearch(query, locale, { proxyBaseUrl: geocodeProxyBaseUrl });
}

export function reverseLookup(
  lat: number,
  lng: number,
  locale: Locale
): Promise<ReverseGeocodeResult> {
  return reverseGeocode(lat, lng, locale, { proxyBaseUrl: geocodeProxyBaseUrl });
}

/** Fetch a single listing by id (Supabase when configured; demo otherwise). */
export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as Listing) ?? null;
  }
  return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
}

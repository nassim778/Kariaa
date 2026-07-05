import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseServer";
import { DEMO_LISTINGS, haversine } from "@/lib/demoListings";
import { Listing, PropertyType } from "@/lib/types";

export const dynamic = "force-dynamic";

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseTypes(v: string | null): PropertyType[] | undefined {
  if (!v) return undefined;
  const arr = v.split(",").map((s) => s.trim()).filter(Boolean) as PropertyType[];
  return arr.length ? arr : undefined;
}

/**
 * GET /api/listings
 *   Viewport mode : ?minLng&minLat&maxLng&maxLat
 *   Radius mode   : ?centerLng&centerLat&radius (metres)
 *   Filters       : ?minPrice&maxPrice&types=a,b&minBeds
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const minPrice = num(p.get("minPrice"));
  const maxPrice = num(p.get("maxPrice"));
  const minBeds = num(p.get("minBeds"));
  const types = parseTypes(p.get("types"));

  const centerLng = num(p.get("centerLng"));
  const centerLat = num(p.get("centerLat"));
  const radius = num(p.get("radius"));
  const isRadius =
    centerLng !== undefined && centerLat !== undefined && radius !== undefined;

  const minLng = num(p.get("minLng"));
  const minLat = num(p.get("minLat"));
  const maxLng = num(p.get("maxLng"));
  const maxLat = num(p.get("maxLat"));

  const supabase = getSupabase();

  // --- Supabase / PostGIS path -------------------------------------------
  if (supabase) {
    try {
      if (isRadius) {
        const { data, error } = await supabase.rpc("listings_in_radius", {
          center_lng: centerLng,
          center_lat: centerLat,
          radius_m: radius,
          min_price: minPrice ?? null,
          max_price: maxPrice ?? null,
          types: types ?? null,
          min_beds: minBeds ?? null,
        });
        if (error) throw error;
        return NextResponse.json({ listings: data ?? [], source: "supabase" });
      }
      if (
        minLng !== undefined &&
        minLat !== undefined &&
        maxLng !== undefined &&
        maxLat !== undefined
      ) {
        const { data, error } = await supabase.rpc("listings_in_bbox", {
          min_lng: minLng,
          min_lat: minLat,
          max_lng: maxLng,
          max_lat: maxLat,
          min_price: minPrice ?? null,
          max_price: maxPrice ?? null,
          types: types ?? null,
          min_beds: minBeds ?? null,
        });
        if (error) throw error;
        return NextResponse.json({ listings: data ?? [], source: "supabase" });
      }
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("is_active", true)
        .limit(500);
      if (error) throw error;
      return NextResponse.json({ listings: data ?? [], source: "supabase" });
    } catch (e) {
      // Fall through to demo data on any backend error.
      console.error("Supabase query failed, using demo data:", e);
    }
  }

  // --- Bundled demo-data fallback ----------------------------------------
  const passesFilters = (l: Listing) =>
    (minPrice === undefined || l.price >= minPrice) &&
    (maxPrice === undefined || l.price <= maxPrice) &&
    (minBeds === undefined || l.bedrooms >= minBeds) &&
    (!types || types.includes(l.type));

  let result: Listing[];

  if (isRadius) {
    result = DEMO_LISTINGS.filter(passesFilters)
      .map((l) => ({
        ...l,
        distance_m: haversine(centerLat!, centerLng!, l.lat, l.lng),
      }))
      .filter((l) => (l.distance_m as number) <= radius!)
      .sort((a, b) => (a.distance_m as number) - (b.distance_m as number));
  } else if (
    minLng !== undefined &&
    minLat !== undefined &&
    maxLng !== undefined &&
    maxLat !== undefined
  ) {
    result = DEMO_LISTINGS.filter(passesFilters).filter(
      (l) =>
        l.lng >= minLng &&
        l.lng <= maxLng &&
        l.lat >= minLat &&
        l.lat <= maxLat
    );
  } else {
    result = DEMO_LISTINGS.filter(passesFilters);
  }

  return NextResponse.json({ listings: result, source: "demo" });
}

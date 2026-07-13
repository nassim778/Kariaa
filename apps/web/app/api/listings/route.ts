import { NextRequest } from "next/server";
import { listingsQuerySchema, searchListings } from "@karia/shared";
import { getSupabase } from "@/lib/supabaseServer";
import { apiError, apiOk } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/listings
 *   Viewport mode : ?minLng&minLat&maxLng&maxLat
 *   Radius mode   : ?centerLng&centerLat&radius (metres)
 *   Filters       : ?minPrice&maxPrice&types=a,b&minBeds
 */
export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listingsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(400, "invalid_query", parsed.error.issues[0]?.message ?? "Invalid query");
  }

  const q = parsed.data;
  const isRadius =
    q.centerLng !== undefined &&
    q.centerLat !== undefined &&
    q.radius !== undefined;
  const hasBBox =
    q.minLng !== undefined &&
    q.minLat !== undefined &&
    q.maxLng !== undefined &&
    q.maxLat !== undefined;

  const supabase = getSupabase();

  try {
    const result = await searchListings(supabase as never, {
      filters: {
        minPrice: q.minPrice,
        maxPrice: q.maxPrice,
        minBeds: q.minBeds,
        types: q.types,
      },
      center: isRadius
        ? { lat: q.centerLat!, lng: q.centerLng!, radiusM: q.radius! }
        : undefined,
      bbox: hasBBox
        ? {
            minLng: q.minLng!,
            minLat: q.minLat!,
            maxLng: q.maxLng!,
            maxLat: q.maxLat!,
          }
        : undefined,
    });
    return apiOk({ listings: result.listings, source: result.source });
  } catch (e) {
    logger.error("listings_query_failed", { route: "/api/listings", err: e });
    return apiError(500, "backend_unavailable", "Failed to load listings");
  }
}

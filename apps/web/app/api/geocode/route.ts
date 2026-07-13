import { NextRequest } from "next/server";
import { geocodeQuerySchema, geocodeSearch } from "@karia/shared";
import { apiError, apiOk } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/geocode?q=...&lang=fr|en|tn|ar
 */
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`geocode:${ip}`, 30, 60_000);
  if (!limited.ok) {
    return apiError(429, "rate_limited", "Too many geocode requests", {
      places: [],
      retryAfterSec: limited.retryAfterSec,
    });
  }

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = geocodeQuerySchema.safeParse(raw);
  if (!parsed.success) {
    if (!raw.q?.trim()) return apiOk({ places: [] });
    return apiError(400, "invalid_query", parsed.error.issues[0]?.message ?? "Invalid query", {
      places: [],
    });
  }

  const lang =
    parsed.data.lang === "ar" ? "tn" : (parsed.data.lang ?? "fr");

  try {
    const places = await geocodeSearch(parsed.data.q, lang);
    return apiOk({ places });
  } catch (e) {
    logger.error("geocode_failed", { route: "/api/geocode", err: e });
    return apiError(502, "geocode_failed", "Geocoding failed", { places: [] });
  }
}

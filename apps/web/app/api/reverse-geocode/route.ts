import { NextRequest } from "next/server";
import { reverseGeocode, reverseGeocodeQuerySchema } from "@karia/shared";
import { apiError, apiOk } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/reverse-geocode?lat=..&lng=..&lang=fr|en|tn|ar
 */
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`revgeo:${ip}`, 30, 60_000);
  if (!limited.ok) {
    return apiError(429, "rate_limited", "Too many reverse-geocode requests", {
      governorate: null,
      delegation: null,
      address: null,
      retryAfterSec: limited.retryAfterSec,
    });
  }

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = reverseGeocodeQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(
      400,
      "invalid_query",
      parsed.error.issues[0]?.message ?? "Invalid coordinates"
    );
  }

  const lang =
    parsed.data.lang === "ar" ? "tn" : (parsed.data.lang ?? "fr");

  try {
    const result = await reverseGeocode(parsed.data.lat, parsed.data.lng, lang);
    return apiOk(result);
  } catch (e) {
    logger.error("reverse_geocode_failed", {
      route: "/api/reverse-geocode",
      err: e,
    });
    return apiError(502, "geocode_failed", "Reverse geocoding failed", {
      governorate: null,
      delegation: null,
      address: null,
    });
  }
}

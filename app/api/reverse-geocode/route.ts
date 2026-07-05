import { NextRequest, NextResponse } from "next/server";
import { acceptLanguageFor, localeToNominatimLang } from "@/lib/nominatimLang";
import { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function parseLang(v: string | null): Locale {
  if (v === "en" || v === "tn" || v === "ar") return v === "ar" ? "tn" : v;
  return "fr";
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
  // Nominatim returns things like "Gouvernorat de Tunis" / "Tunis Governorate".
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

/**
 * GET /api/reverse-geocode?lat=..&lng=..
 * Uses OpenStreetMap Nominatim reverse geocoding to derive the governorate,
 * délégation and a street-level address from a map point.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ error: "missing_coords" }, { status: 400 });
  }

  const locale = parseLang(req.nextUrl.searchParams.get("lang"));
  const nominatimLang = localeToNominatimLang(locale);

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lng);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", nominatimLang);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Karia-RealEstate/0.1 (map rental platform, Tunisia)",
        "Accept-Language": acceptLanguageFor(locale),
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = (await res.json()) as {
      address?: NominatimAddress;
      display_name?: string;
    };
    const a = data.address ?? {};

    const governorate = cleanGovernorate(a.state ?? a.region);

    // Délégation ≈ county / municipality / district level in Tunisia.
    const delegation =
      a.county ||
      a.city_district ||
      a.municipality ||
      a.town ||
      a.city ||
      a.suburb ||
      a.village ||
      null;

    // Street-level address from the most specific available parts.
    const address =
      [a.road, a.neighbourhood || a.quarter || a.suburb]
        .filter(Boolean)
        .join(", ") ||
      data.display_name?.split(",").slice(0, 2).join(", ") ||
      null;

    return NextResponse.json({ governorate, delegation, address });
  } catch (e) {
    console.error("Reverse geocode failed:", e);
    return NextResponse.json(
      { governorate: null, delegation: null, address: null },
      { status: 200 }
    );
  }
}

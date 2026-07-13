import { NextRequest, NextResponse } from "next/server";
import { acceptLanguageFor, localeToNominatimLang } from "@/lib/nominatimLang";
import { Locale } from "@/lib/i18n";
import { GeoPlace } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseLang(v: string | null): Locale {
  if (v === "en" || v === "tn" || v === "ar") return v === "ar" ? "tn" : v;
  return "fr";
}

/**
 * GET /api/geocode?q=...&lang=fr|en|tn|ar
 * Proxies OpenStreetMap Nominatim so we can set a proper User-Agent and keep
 * the search scoped to Tunisia. Supports Arabic queries (e.g. مستشفى، المرسى).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ places: [] });

  const locale = parseLang(req.nextUrl.searchParams.get("lang"));
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
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Karia-RealEstate/0.1 (map rental platform, Tunisia)",
        "Accept-Language": acceptLanguageFor(locale),
      },
      // Cache identical lookups for a while to respect Nominatim usage policy.
      next: { revalidate: 3600 },
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

    const places: GeoPlace[] = data.map((d) => {
      // Prefer Arabic label when the user searches in Arabic script.
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
    return NextResponse.json({ places });
  } catch (e) {
    console.error("Geocode failed:", e);
    return NextResponse.json({ places: [], error: "geocode_failed" }, { status: 200 });
  }
}

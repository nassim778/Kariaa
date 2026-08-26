export type PropertyType =
  | "apartment"
  | "house"
  | "studio"
  | "villa"
  | "room"
  | "office";

export interface Listing {
  id: string;
  title: string;
  description: string | null;
  type: PropertyType;
  price: number; // monthly rent, TND
  bedrooms: number;
  bathrooms: number;
  area_sqm: number | null;
  governorate: string | null;
  delegation: string | null;
  address: string | null;
  /** @deprecated Use image_urls — kept for legacy rows / demo fallback */
  image_url?: string | null;
  image_urls?: string[] | null;
  phone?: string | null;
  owner_id?: string | null;
  is_active?: boolean;
  lat: number;
  lng: number;
  distance_m?: number; // populated by radius search
}

export interface Filters {
  minPrice?: number;
  maxPrice?: number;
  types?: PropertyType[];
  /**
   * Exact Tunisian size filter (S+n).
   * 0 = studio (S+0); 1 = S+1 only; 2 = S+2 only; etc.
   * (Wire name stays `minBeds` for API compatibility.)
   */
  minBeds?: number;
}

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface GeoPlace {
  name: string;
  lat: number;
  lng: number;
  type?: string;
  /** When false, selecting this place won't recenter/zoom the map. */
  fit?: boolean;
}

/**
 * Tunisian "S+n" size notation (Salon + n rooms), the standard way locals
 * identify a property. Studios are shown as "S+0".
 */
export function sizeLabel(l: Pick<Listing, "type" | "bedrooms">): string {
  if (l.type === "studio") return "S+0";
  return `S+${l.bedrooms}`;
}

/** Exact S+n match used by listing filters (not "n or more"). */
export function matchesSizeFilter(
  l: Pick<Listing, "type" | "bedrooms">,
  sizeN: number | undefined
): boolean {
  if (sizeN === undefined) return true;
  if (sizeN === 0) return l.type === "studio";
  return l.type !== "studio" && l.bedrooms === sizeN;
}

export const PROPERTY_TYPES: PropertyType[] = [
  "apartment",
  "house",
  "studio",
  "villa",
  "room",
  "office",
];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Appartement",
  house: "Maison",
  studio: "Studio",
  villa: "Villa",
  room: "Chambre",
  office: "Bureau",
};

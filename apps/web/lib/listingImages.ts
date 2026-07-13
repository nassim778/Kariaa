import { BRAND } from "./brand";
import { Listing } from "./types";

/** Max photos per listing in the UI. */
export const MAX_LISTING_IMAGES = 10;

/** All image URLs for a listing (supports legacy single image_url). */
export function listingImages(
  l: Pick<Listing, "image_urls" | "image_url">
): string[] {
  if (l.image_urls?.length) {
    return l.image_urls.filter((u) => Boolean(u?.trim()));
  }
  if (l.image_url?.trim()) return [l.image_url.trim()];
  return [];
}

export function listingCoverImage(
  l: Pick<Listing, "image_urls" | "image_url">
): string | null {
  return listingImages(l)[0] ?? null;
}

export function listingCoverOrPlaceholder(
  l: Pick<Listing, "image_urls" | "image_url">
): string {
  return listingCoverImage(l) ?? BRAND.placeholderListing;
}

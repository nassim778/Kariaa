import { Listing } from "./types";

/** Max photos per listing in the UI. */
export const MAX_LISTING_IMAGES = 10;

/** Default placeholder when a listing has no images (web/mobile can override). */
export const DEFAULT_LISTING_PLACEHOLDER = "/placeholder-listing.png";

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

/** First image URL for a listing, or null when it has none. */
export function listingCoverImage(
  l: Pick<Listing, "image_urls" | "image_url">
): string | null {
  return listingImages(l)[0] ?? null;
}

/** Cover image or a placeholder path/URL. */
export function listingCoverOrPlaceholder(
  l: Pick<Listing, "image_urls" | "image_url">,
  placeholder: string = DEFAULT_LISTING_PLACEHOLDER
): string {
  return listingCoverImage(l) ?? placeholder;
}

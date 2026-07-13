import { Locale } from "./i18n";

/** Map Karia locale → Nominatim / Accept-Language preference. */
export function localeToNominatimLang(locale: Locale): string {
  if (locale === "tn") return "ar";
  if (locale === "en") return "en";
  return "fr";
}

/** Accept-Language header value with the user's language first. */
export function acceptLanguageFor(locale: Locale): string {
  const primary = localeToNominatimLang(locale);
  if (primary === "ar") return "ar,fr,en";
  if (primary === "en") return "en,fr,ar";
  return "fr,ar,en";
}

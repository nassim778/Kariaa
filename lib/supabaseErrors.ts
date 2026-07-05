/** Extract a human-readable message from Supabase / PostgREST errors. */
export function formatSupabaseError(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const e = err as { message?: string; details?: string; hint?: string };
  const parts = [e.message, e.details, e.hint].filter(Boolean);
  return parts.join(" — ");
}

export function isMissingColumnError(message: string): boolean {
  return /image_urls|phone|schema cache|column/i.test(message);
}

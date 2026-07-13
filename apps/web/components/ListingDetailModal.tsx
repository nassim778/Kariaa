"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { propertyTypeKey } from "@/lib/i18n";
import { BRAND } from "@/lib/brand";
import { listingImages } from "@/lib/listingImages";
import { Listing, sizeLabel } from "@/lib/types";

interface Props {
  listing: Listing;
  currentUserId: string | null;
  onClose: () => void;
  onEdit?: () => void;
}

export default function ListingDetailModal({
  listing: l,
  currentUserId,
  onClose,
  onEdit,
}: Props) {
  const { t } = useI18n();
  const { session } = useAuth();
  const images = listingImages(l);
  const displayImages = images.length ? images : [BRAND.placeholderListing];
  const [imageIdx, setImageIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const activeImage = displayImages[imageIdx] ?? displayImages[0];
  const owned = Boolean(
    currentUserId && l.owner_id && l.owner_id === currentUserId
  );

  const prevImage = useCallback(() => {
    if (displayImages.length < 2) return;
    setImageIdx((i) => (i - 1 + displayImages.length) % displayImages.length);
  }, [displayImages.length]);

  const nextImage = useCallback(() => {
    if (displayImages.length < 2) return;
    setImageIdx((i) => (i + 1) % displayImages.length);
  }, [displayImages.length]);

  const openFullscreen = (idx?: number) => {
    if (idx !== undefined) setImageIdx(idx);
    setFullscreen(true);
  };

  useEffect(() => {
    if (!fullscreen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "ArrowRight") nextImage();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, prevImage, nextImage]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || displayImages.length < 2) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) prevImage();
    else nextImage();
  };

  const phoneHref = l.phone?.replace(/[^\d+]/g, "");

  const submitReport = async () => {
    setReportMsg(null);
    if (!session?.access_token) {
      setReportMsg(t("report_need_auth"));
      return;
    }
    setReportLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ listingId: l.id, reason: reportReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReportMsg(data?.error?.message ?? t("generic_error"));
        return;
      }
      setReportMsg(t("report_sent"));
      setReportOpen(false);
      setReportReason("");
    } catch {
      setReportMsg(t("generic_error"));
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <div
          className="karia-scroll flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative shrink-0 bg-slate-100">
            <button
              type="button"
              onClick={() => openFullscreen()}
              className="group relative block w-full cursor-zoom-in"
              aria-label={t("detail_view_fullscreen")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage}
                alt={l.title}
                className="h-56 w-full object-cover sm:h-60"
              />
              <span className="pointer-events-none absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 sm:opacity-100">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </span>
            </button>

            {displayImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/65"
                  aria-label={t("detail_prev_image")}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-12 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/65"
                  aria-label={t("detail_next_image")}
                >
                  ›
                </button>
                <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {displayImages.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition ${
                        i === imageIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
              aria-label={t("detail_close")}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {displayImages.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-white px-3 py-2">
              {displayImages.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => openFullscreen(i)}
                  className={`h-12 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-md border-2 ${
                    i === imageIdx ? "border-brand" : "border-transparent opacity-70"
                  }`}
                  aria-label={t("detail_view_fullscreen")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="karia-sheet flex-1 overflow-auto p-5 pb-6">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-2xl font-bold text-brand">
                {l.price} {t("currency")}
              </span>
              <span className="text-sm text-slate-400">{t("per_month")}</span>
              {l.distance_m !== undefined && (
                <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  {(l.distance_m / 1000).toFixed(1)} {t("km")}
                </span>
              )}
            </div>

            <h2 className="mt-2 text-lg font-semibold text-slate-800">{l.title}</h2>

            <p className="mt-1 text-sm text-slate-500">
              {t(propertyTypeKey(l.type))} · {sizeLabel(l)} · {l.bedrooms}{" "}
              {t("rooms_abbr")} · {l.bathrooms} {t("field_baths")} ·{" "}
              {l.area_sqm ?? "—"} m²
            </p>

            {l.phone && (
              <a
                href={phoneHref ? `tel:${phoneHref}` : undefined}
                className="mt-4 flex min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-medium text-white transition active:bg-brand-dark sm:hover:bg-brand-dark"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {t("call_owner")} · {l.phone}
              </a>
            )}

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">{t("location_label")}</p>
              <p className="mt-1 text-sm text-slate-700">
                {[l.delegation, l.governorate].filter(Boolean).join(", ") || "—"}
              </p>
              {l.address && (
                <p className="mt-1 text-xs text-slate-500">{l.address}</p>
              )}
              <p className="mt-2 font-mono text-[11px] text-slate-400">
                {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500">
                {t("field_description")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {l.description?.trim() || t("detail_no_description")}
              </p>
            </div>

            {owned && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="mt-5 w-full rounded-xl border border-brand py-2.5 text-sm font-medium text-brand transition hover:bg-brand hover:text-white"
              >
                {t("edit_my_listing")}
              </button>
            )}

            {!owned && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {!reportOpen ? (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    {t("report_listing")}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder={t("report_reason_ph")}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={reportLoading}
                        onClick={submitReport}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      >
                        {t("report_listing")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportOpen(false)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                )}
                {reportMsg && (
                  <p className="mt-2 text-xs text-slate-600">{reportMsg}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={t("detail_view_fullscreen")}
          onClick={() => setFullscreen(false)}
        >
          <div className="flex shrink-0 items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            {displayImages.length > 1 ? (
              <span className="text-sm font-medium text-white/80">
                {t("detail_image_count")
                  .replace("{current}", String(imageIdx + 1))
                  .replace("{total}", String(displayImages.length))}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label={t("detail_close")}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            {displayImages.length > 1 && (
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:left-4"
                aria-label={t("detail_prev_image")}
              >
                ‹
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage}
              alt={l.title}
              className="max-h-[calc(100dvh-8rem)] max-w-full object-contain select-none"
              draggable={false}
            />

            {displayImages.length > 1 && (
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20 sm:right-4"
                aria-label={t("detail_next_image")}
              >
                ›
              </button>
            )}
          </div>

          {displayImages.length > 1 && (
            <div
              className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              {displayImages.map((url, i) => (
                <button
                  key={`fs-${url}-${i}`}
                  type="button"
                  onClick={() => setImageIdx(i)}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === imageIdx
                      ? "border-white opacity-100"
                      : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

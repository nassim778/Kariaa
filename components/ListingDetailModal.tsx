"use client";

import { useState } from "react";
import { useI18n } from "./LanguageProvider";
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
  const images = listingImages(l);
  const displayImages = images.length ? images : [BRAND.placeholderListing];
  const [imageIdx, setImageIdx] = useState(0);
  const activeImage = displayImages[imageIdx] ?? displayImages[0];
  const owned = Boolean(
    currentUserId && l.owner_id && l.owner_id === currentUserId
  );

  const prevImage = () => {
    if (displayImages.length < 2) return;
    setImageIdx((i) => (i - 1 + displayImages.length) % displayImages.length);
  };

  const nextImage = () => {
    if (displayImages.length < 2) return;
    setImageIdx((i) => (i + 1) % displayImages.length);
  };

  const phoneHref = l.phone?.replace(/[^\d+]/g, "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="karia-scroll flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={l.title}
            className="h-52 w-full object-cover sm:h-60"
          />

          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/65"
                aria-label={t("detail_close")}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-12 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white hover:bg-black/65"
                aria-label={t("detail_close")}
              >
                ›
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {displayImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImageIdx(i)}
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
                onClick={() => setImageIdx(i)}
                className={`h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                  i === imageIdx ? "border-brand" : "border-transparent opacity-70"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto p-5">
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
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
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
        </div>
      </div>
    </div>
  );
}

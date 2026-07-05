"use client";

import { GeoPlace, Listing } from "@/lib/types";
import { listingCoverOrPlaceholder } from "@/lib/listingImages";
import { useI18n } from "./LanguageProvider";
import { propertyTypeKey } from "@/lib/i18n";

interface Props {
  listings: Listing[];
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  onListingClick: (id: string) => void;
  poi: GeoPlace | null;
  radiusM: number;
  onClearPoi: () => void;
  onClose?: () => void;
}

export default function Sidebar({
  listings,
  activeId,
  onActiveChange,
  onListingClick,
  poi,
  radiusM,
  onClearPoi,
  onClose,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
        <div className="h-1 w-10 rounded-full bg-slate-300" aria-hidden />
      </div>
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">
            {t("results_found", { count: listings.length })}
          </p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 touch-manipulation place-items-center rounded-full text-slate-400 active:bg-slate-100 sm:hidden"
              aria-label={t("hide")}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {poi ? (
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="text-xs text-blue-600">
              {t("radius_of", { km: radiusM / 1000 })}{" "}
              <span className="font-medium">{poi.name.split(",")[0]}</span>
            </p>
            <button
              onClick={onClearPoi}
              className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-200"
            >
              {t("clear")}
            </button>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400">{t("in_visible_area")}</p>
        )}
      </div>

      <div className="karia-scroll flex-1 overflow-auto">
        {listings.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            {t("none_here")}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {listings.map((l) => {
              const cover = listingCoverOrPlaceholder(l);
              return (
              <li key={l.id}>
                <button
                  onClick={() => {
                    onActiveChange(l.id);
                    onListingClick(l.id);
                  }}
                  onMouseEnter={() => onActiveChange(l.id)}
                  className={`flex w-full gap-3 p-3.5 text-left transition active:bg-slate-100 sm:p-3 sm:hover:bg-slate-50 ${
                    activeId === l.id ? "bg-teal-50" : ""
                  }`}
                >
                  <div className="relative h-[4.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-24 sm:rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={l.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-brand">
                        {l.price} {t("currency")}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {t("per_month")}
                      </span>
                      {l.distance_m !== undefined && (
                        <span className="ml-auto text-[11px] font-medium text-blue-600">
                          {(l.distance_m / 1000).toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-slate-800">
                      {l.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {t(propertyTypeKey(l.type))} · {l.bedrooms} {t("rooms_abbr")}{" "}
                      · {l.area_sqm ?? "—"} m²
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {l.delegation}, {l.governorate}
                    </p>
                  </div>
                </button>
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

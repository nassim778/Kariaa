"use client";

import { Filters, PropertyType, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { useI18n } from "./LanguageProvider";
import { propertyTypeKey } from "@/lib/i18n";

const TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];
const RADII = [1000, 2000, 5000, 10000];

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  radiusM: number;
  onRadiusChange: (m: number) => void;
  poiActive: boolean;
}

export default function FiltersBar({
  filters,
  onChange,
  radiusM,
  onRadiusChange,
  poiActive,
}: Props) {
  const { t: tr } = useI18n();
  const selectedType =
    filters.types?.length === 1 ? filters.types[0] : "";

  return (
    <div className="karia-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {/* Radius (only meaningful once a place is picked) */}
      <select
        value={radiusM}
        onChange={(e) => onRadiusChange(Number(e.target.value))}
        disabled={!poiActive}
        className={`shrink-0 touch-manipulation rounded-full border px-3 py-1.5 text-xs outline-none transition ${
          poiActive
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
        }`}
        title={poiActive ? tr("radius_enabled") : tr("radius_pick_place")}
      >
        {RADII.map((r) => (
          <option key={r} value={r}>
            {r / 1000} {tr("km")}
          </option>
        ))}
      </select>

      {/* Property type */}
      <select
        value={selectedType}
        onChange={(e) => {
          const value = e.target.value as PropertyType | "";
          onChange({
            ...filters,
            types: value ? [value] : undefined,
          });
        }}
        className="shrink-0 touch-manipulation rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 outline-none"
      >
        <option value="">{tr("field_type")}</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {tr(propertyTypeKey(t))}
          </option>
        ))}
      </select>

      {/* Price */}
      <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1.5">
        <input
          type="number"
          inputMode="numeric"
          placeholder={tr("price_min")}
          value={filters.minPrice ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              minPrice: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-16 bg-transparent text-xs outline-none placeholder:text-slate-400"
        />
        <span className="text-xs text-slate-400">–</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder={tr("price_max")}
          value={filters.maxPrice ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              maxPrice: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-16 bg-transparent text-xs outline-none placeholder:text-slate-400"
        />
        <span className="pr-1 text-[10px] text-slate-400">{tr("currency")}</span>
      </div>

      {/* Exact size S+n (studio = S+0) */}
      <select
        value={filters.minBeds ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            minBeds: e.target.value !== "" ? Number(e.target.value) : undefined,
          })
        }
        className="shrink-0 touch-manipulation rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 outline-none"
      >
        <option value="">{tr("bedrooms")}</option>
        <option value="0">S+0</option>
        <option value="1">S+1</option>
        <option value="2">S+2</option>
        <option value="3">S+3</option>
        <option value="4">S+4</option>
        <option value="5">S+5</option>
      </select>
    </div>
  );
}

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
  const toggleType = (t: PropertyType) => {
    const cur = filters.types ?? [];
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
    onChange({ ...filters, types: next.length ? next : undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Property types */}
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => {
          const active = filters.types?.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand"
              }`}
            >
              {tr(propertyTypeKey(t))}
            </button>
          );
        })}
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {/* Price */}
      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
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

      {/* Bedrooms */}
      <select
        value={filters.minBeds ?? ""}
        onChange={(e) =>
          onChange({
            ...filters,
            minBeds: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 outline-none"
      >
        <option value="">{tr("bedrooms")}</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
      </select>

      {/* Radius (only meaningful once a place is picked) */}
      <select
        value={radiusM}
        onChange={(e) => onRadiusChange(Number(e.target.value))}
        disabled={!poiActive}
        className={`rounded-full border px-3 py-1 text-xs outline-none transition ${
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
    </div>
  );
}

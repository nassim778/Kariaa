"use client";

import { useEffect, useRef, useState } from "react";
import { GeoPlace } from "@/lib/types";
import { useI18n } from "./LanguageProvider";

interface Props {
  onSelect: (place: GeoPlace) => void;
}

/** Minimum query length — Arabic script can be shorter per word. */
function minQueryLen(q: string): number {
  return /[\u0600-\u06FF]/.test(q) ? 2 : 3;
}

export default function PlaceSearch({ onSelect }: Props) {
  const { t, locale, dir } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < minQueryLen(trimmed)) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}&lang=${locale}`
        );
        const data = await res.json();
        if (!res.ok) {
          setResults([]);
          return;
        }
        setResults(data.places ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q, locale]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (p: GeoPlace) => {
    setQ(p.name.split(",")[0]);
    setOpen(false);
    onSelect(p);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-brand sm:py-2">
        <svg className="h-4 w-4 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={t("search_placeholder")}
          dir={dir}
          lang={locale === "tn" ? "ar" : locale}
          className="w-full bg-transparent text-base outline-none placeholder:text-slate-400 sm:text-sm"
        />
        {loading && (
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          className="karia-scroll absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          dir={dir}
        >
          {results.map((p, i) => (
            <li key={i}>
              <button
                onClick={() => pick(p)}
                className={`flex w-full items-start gap-2 px-3 py-2 hover:bg-slate-50 ${
                  dir === "rtl" ? "text-right" : "text-left"
                }`}
              >
                <span className="mt-0.5 text-brand">📍</span>
                <span className="text-sm text-slate-700 leading-snug">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

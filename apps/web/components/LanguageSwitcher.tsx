"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "./LanguageProvider";
import { LOCALES } from "@/lib/i18n";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div
      ref={ref}
      className={`relative w-full min-w-0 shrink-0 sm:min-w-[7.5rem] ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-[28px] touch-manipulation items-center justify-between gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-medium text-slate-700 shadow-sm transition active:bg-slate-100 sm:min-h-[36px] sm:gap-2 sm:rounded-lg sm:px-2.5 sm:py-2 sm:text-[11px] sm:hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-1 sm:gap-1.5">
          <svg
            className="hidden h-3 w-3 text-slate-400 sm:block sm:h-3.5 sm:w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          {current.label}
        </span>
        <svg
          className={`h-2.5 w-2.5 shrink-0 text-slate-400 transition sm:h-3 sm:w-3 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-0.5 overflow-hidden rounded-md border border-slate-200 bg-white py-0.5 shadow-lg sm:mt-1 sm:rounded-lg"
        >
          {LOCALES.map((l) => (
            <li key={l.id} role="option" aria-selected={locale === l.id}>
              <button
                type="button"
                onClick={() => {
                  setLocale(l.id);
                  setOpen(false);
                }}
                className={`flex w-full min-h-[32px] touch-manipulation items-center px-2 py-1.5 text-left text-[10px] font-medium transition active:bg-slate-100 sm:min-h-[40px] sm:px-3 sm:py-2.5 sm:text-[11px] ${
                  locale === l.id
                    ? "bg-brand/10 text-brand"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useI18n } from "@/components/LanguageProvider";

export default function MapLoading() {
  const { t } = useI18n();
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm text-slate-500">{t("loading_map")}</p>
      </div>
    </div>
  );
}

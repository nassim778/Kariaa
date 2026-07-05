"use client";

import { useI18n } from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import BrandLogo from "./BrandLogo";

export default function KariaBrandBlock({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2.5">
        <BrandLogo size={44} />
        <p className="max-w-[8.5rem] text-[10px] leading-snug text-slate-400">
          {t("tagline")}
        </p>
      </div>
      <LanguageSwitcher />
    </div>
  );
}

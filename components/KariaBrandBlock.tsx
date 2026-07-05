"use client";

import { useI18n } from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import BrandLogo from "./BrandLogo";

export default function KariaBrandBlock({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (compact) {
    return (
      <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        <BrandLogo size={34} />
        <LanguageSwitcher className="w-auto min-w-[6.5rem]" />
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2.5">
        <BrandLogo size={44} />
        <p className="max-w-[8.5rem] text-[10px] leading-snug text-slate-400 sm:max-w-none">
          {t("tagline")}
        </p>
      </div>
      <LanguageSwitcher />
    </div>
  );
}

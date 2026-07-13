"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/LanguageProvider";

const BODY = {
  fr: `Ceci est un texte provisoire des conditions d'utilisation de Karia.

Karia est une plateforme de mise en relation pour la location immobilière en Tunisie. Les annonces sont publiées par des utilisateurs ; Karia n'est pas partie aux contrats de location.

Vous vous engagez à publier des informations exactes, à ne pas publier de contenu illicite, et à respecter les autres utilisateurs.

Karia peut modérer ou retirer des annonces signalées. L'utilisation abusive du service peut entraîner la suspension du compte.

Remplacez ce texte par des conditions juridiques définitives avant le lancement public.`,
  en: `This is placeholder Terms of Service text for Karia.

Karia is a map-based rental listing platform for Tunisia. Listings are published by users; Karia is not a party to rental contracts.

You agree to publish accurate information, avoid unlawful content, and respect other users.

Karia may moderate or remove reported listings. Abuse of the service may lead to account suspension.

Replace this text with final legal terms before public launch.`,
  tn: `هذا نص مؤقت لشروط استخدام كارية.

كارية منصة إعلانات كراء على الخريطة في تونس. الإعلانات ينشروها المستخدمين؛ كارية مش طرف في عقود الكراء.

تلتزم تنشر معلومات صحيحة، وما تنشرش محتوى مخالف، وتحترم المستخدمين الأخرين.

كارية تنجّم تعدّل أو تشيل إعلانات مبلّغ عليها. سوء الاستعمال ينجّم يوقف الحساب.

بدّل هذا النص بشروط قانونية نهائية قبل الإطلاق العمومي.`,
} as const;

export default function TermsPage() {
  const { t, locale } = useI18n();
  const text = BODY[locale] ?? BODY.fr;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size={36} />
          <span className="font-semibold text-brand">Karia</span>
        </Link>
        <LanguageSwitcher />
      </div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{t("terms_title")}</h1>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {text}
      </div>
      <Link href="/" className="mt-8 inline-block text-sm font-medium text-brand">
        {t("back_home")}
      </Link>
    </main>
  );
}

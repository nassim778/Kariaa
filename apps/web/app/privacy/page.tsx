"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/LanguageProvider";

const BODY = {
  fr: ` politique de confidentialité pour Karia (Tunisie).

Karia collecte les données nécessaires au fonctionnement du service de location sur carte : compte (e-mail), annonces (titre, description, photos, localisation, téléphone), et préférences de langue.

Les données de localisation sont utilisées pour afficher les biens sur la carte. Les photos sont stockées dans un service cloud sécurisé (Supabase Storage).

Vous pouvez demander la suppression de votre compte et des données associées depuis l'application.

Ce document doit être relu et remplacé par un texte juridique définitif avant un lancement public.`,
  en: `Privacy Policy text for Karia (Tunisia).

Karia collects data needed to operate the map-based rental service: account (email), listings (title, description, photos, location, phone), and language preferences.

Location data is used to place properties on the map. Photos are stored in a secure cloud service (Supabase Storage).

You may request deletion of your account and associated data from within the app.

Replace this document with final legal copy before public launch.`,
  tn: `سياسة الخصوصية كرية (تونس).

نخدموا بالمعطيات اللازمة للخدمة: الحساب (الإيميل)، الإعلانات (العنوان، الوصف، الصور، الموقع، التليفون)، ولغة الواجهة.

الموقع يُستعمل باش نعرضو العقارات على الخريطة. الصور تتخزّن في خدمة سحابية آمنة.

تنجّم تطلب مسح حسابك ومعطياتك من التطبيق.

بدّل هذا النص بنص قانوني نهائي قبل الإطلاق العمومي.`,
} as const;

export default function PrivacyPage() {
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
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{t("privacy_title")}</h1>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {text}
      </div>
      <Link href="/" className="mt-8 inline-block text-sm font-medium text-brand">
        {t("back_home")}
      </Link>
    </main>
  );
}

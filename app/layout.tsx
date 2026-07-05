import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "كرية — Location immobilière sur carte en Tunisie",
  description:
    "Trouvez votre location en Tunisie directement sur la carte. Explorez les biens autour de vous, ou d'un lieu (hôpital, université…) dans un rayon de votre choix.",
  openGraph: {
    title: "كرية — Location sur carte en Tunisie",
    description:
      "Trouvez votre location en Tunisie directement sur la carte.",
    images: [{ url: BRAND.ogImage, width: 1200, height: 630, alt: "كرية" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased text-slate-800">
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Newsreader } from "next/font/google";
import { appConfig } from "@/config/app";
import { portalOrigins } from "@/config/origins";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(portalOrigins.publicSite),
  title: {
    default: "Vase",
    template: "%s | Vase",
  },
  description: appConfig.description,
  applicationName: appConfig.name,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: appConfig.name,
    title: "Vase",
    description:
      "Plataforma SaaS multi-tenant para ecommerce, IA, soporte e integraciones de negocio.",
  },
  icons: { icon: "/vasecolorlogo.png" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      data-theme="light"
      className={`${manrope.variable} ${ibmPlexMono.variable} ${newsreader.variable} light h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only rounded-full bg-[var(--accent)] px-4 py-2 text-[var(--accent-contrast)] focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}

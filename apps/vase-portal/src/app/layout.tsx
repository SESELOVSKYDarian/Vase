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
    locale: "es_AR",
    title: "Vase",
    description: "Tienda online, asistente con IA para WhatsApp e Instagram y gestión para pymes, en una sola plataforma.",
    images: [{ url: "/og/vase.jpg", width: 1200, height: 630, alt: "Vase" }],
  },
  twitter: { card: "summary_large_image", images: ["/og/vase.jpg"] },
  icons: { icon: "/vasecolorlogo.png" },
};

/** Marco base de todas las páginas: idioma, tipografías y datos generales. */
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

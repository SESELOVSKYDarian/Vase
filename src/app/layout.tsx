import { appConfig } from "@/config/app";
import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, Manrope, Newsreader } from "next/font/google";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://vase.ar"),
  title: {
    default: "Vase",
    template: "%s | Vase",
  },
  description:
    "Base enterprise de Vase con Next.js, Auth.js, Prisma, multi-tenancy y seguridad por defecto.",
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
        <Script id="vase-theme-init" strategy="beforeInteractive">
          {`try {
            var storedTheme = localStorage.getItem("vase-panel-theme");
            var theme = storedTheme === "dark" ? "dark" : "light";
            document.documentElement.dataset.theme = theme;
            document.documentElement.classList.toggle("dark", theme === "dark");
            document.documentElement.style.colorScheme = theme;
          } catch (error) {}
          `}
        </Script>
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

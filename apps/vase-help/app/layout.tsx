import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://help.vase.ar"),
  title: { default: "Ayuda de Vase", template: "%s · Ayuda de Vase" },
  description: "Guías cortas con video para manejar tu tienda en Vase Business.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="logo" aria-label="Ayuda de Vase, inicio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="l-dark" src="/brand/vase-logo-white.png" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="l-light" src="/brand/vase-logo-green.png" alt="" />
              help <em>· business</em>
            </Link>
            <div className="sp" />
            <Link className="top-link hide-sm" href="/seccion/programadores">Programadores</Link>
            <a className="top-link" href="https://business.vase.ar/admin">Ir al panel ↗</a>
          </div>
        </header>
        {children}
        <footer className="foot">
          <div className="wrap">
            <span>© {new Date().getFullYear()} Vase</span>
            <div className="sp" />
            <a href="https://vase.ar">vase.ar</a>
            <a href="https://business.vase.ar/admin">Panel de tu tienda</a>
          </div>
        </footer>
      </body>
    </html>
  );
}

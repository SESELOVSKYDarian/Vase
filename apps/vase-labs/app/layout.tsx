import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Vase Labs", description: "IA SaaS de Vase." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="light"
      className="light h-full scroll-smooth antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}

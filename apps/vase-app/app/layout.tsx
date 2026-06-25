import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Vase App",
  description: "Identidad, tenants, billing, marketplace y launcher de Vase.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

import type { ReactNode } from "react";

export const metadata = { title: "Vase Business", description: "Ecommerce SaaS de Vase." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

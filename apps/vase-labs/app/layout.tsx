import type { ReactNode } from "react";

export const metadata = { title: "Vase Labs", description: "IA SaaS de Vase." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

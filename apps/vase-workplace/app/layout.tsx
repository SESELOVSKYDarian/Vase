import type { ReactNode } from "react";

export const metadata = { title: "Vase Workplace", description: "Operacion interna de Vase." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

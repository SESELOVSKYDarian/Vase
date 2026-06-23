import type { ReactNode } from "react";

export const metadata = { title: "Vase Help", description: "Documentacion y knowledge base oficial de Vase." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

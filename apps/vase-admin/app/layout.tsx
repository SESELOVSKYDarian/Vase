import type { ReactNode } from "react";

export const metadata = { title: "Vase Admin", description: "Control plane global de Vase." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

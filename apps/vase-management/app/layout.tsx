import type { ReactNode } from "react";

export const metadata = { title: "Vase Management", description: "ERP SaaS argentino de Vase." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

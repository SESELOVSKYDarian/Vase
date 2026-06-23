import type { ReactNode } from "react";

export const metadata = {
  title: "Vase Portal",
  description: "Marketing, productos y entrada publica del ecosistema Vase.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

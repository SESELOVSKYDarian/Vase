import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Manrope } from "next/font/google";
import "@vase/ui/panel.css";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = { title: "Vase Labs", description: "Tu asistente con IA para WhatsApp, Instagram y Messenger." };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // El modo claro u oscuro se elige en app.vase.ar (Mi perfil) y se comparte con una cookie de .vase.ar.
  const theme = (await cookies()).get("vase_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${theme} ${manrope.variable} h-full antialiased`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}

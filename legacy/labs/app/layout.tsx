import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "VaseLabs | Neural Command Center",
  description: "Advanced AI-driven operational management and neural bridging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}

export type PlatformUpdateItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  publishedAt: string;
  isActive: boolean;
  category: "platform" | "business" | "labs" | "billing";
};

export const platformUpdates: readonly PlatformUpdateItem[] = [
  {
    id: "dashboard-unificado",
    title: "Nuevo dashboard unificado",
    description:
      "Ahora puedes abrir Vase Business y Vase Labs desde un mismo panel central.",
    href: "/app",
    publishedAt: "2026-04-10T12:00:00.000Z",
    isActive: true,
    category: "platform",
  },
  {
    id: "pricing-admin",
    title: "Pricing administrable por módulo",
    description:
      "El panel admin ya puede gestionar precios y estructura comercial de los productos.",
    href: "/app/admin/modules",
    publishedAt: "2026-04-10T12:10:00.000Z",
    isActive: true,
    category: "billing",
  },
  {
    id: "support-ai-faq",
    title: "La IA de soporte usa FAQs",
    description:
      "Las respuestas de soporte ahora pueden incorporar base de conocimiento global y por tenant.",
    href: "/app/support/knowledge",
    publishedAt: "2026-04-10T12:20:00.000Z",
    isActive: true,
    category: "labs",
  },
] as const;

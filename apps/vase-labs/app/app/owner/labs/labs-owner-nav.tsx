import { House, MessagesSquare, ShoppingBag, SlidersHorizontal, Sparkles, WandSparkles } from "lucide-react";

// Menú de Vase Labs.
// - Conversaciones: la bandeja y quién quiere comprar.
// - Marketing: imágenes para vender, pedidas como en un chat.
// - Asistente: cómo habla, qué sabe y lo que le enseñaron por WhatsApp.
// - Configuraciones: plan de uso, canales, motor de IA y puntaje (antes era Ajustes › Labs).
// Ajustes (botón de tu usuario) queda con lo de tu cuenta de Vase: Mi perfil, Mi negocio y Facturación.
export const labsNavigationGroups = [
  {
    label: "Principal",
    items: [
      { id: "inicio", href: "/owner", label: "Inicio", icon: House },
      { id: "conversaciones", href: "/owner/inbox", label: "Conversaciones", icon: MessagesSquare },
      { id: "pedidos", href: "/owner/orders", label: "Pedidos", icon: ShoppingBag },
      { id: "marketing", href: "/owner/marketing", label: "Marketing", icon: WandSparkles },
      { id: "asistente", href: "/owner/knowledge", label: "Asistente", icon: Sparkles },
      { id: "configuraciones", href: "/owner/configuraciones", label: "Configuraciones", icon: SlidersHorizontal },
    ],
  },
] as const;

type LabsNavItem = (typeof labsNavigationGroups)[number]["items"][number];

export const labsNavigationItems: LabsNavItem[] = labsNavigationGroups.flatMap((group): LabsNavItem[] => [...group.items]);

export type LabsSectionId = LabsNavItem["id"] | "ajustes";

/** Qué entrada del menú corresponde a cada pantalla. */
export function resolveLabsSection(pathname: string): LabsSectionId {
  const path = pathname.replace(/\/+$/, "") || "/owner";
  if (path.startsWith("/owner/inbox/trainer") || path.startsWith("/owner/knowledge")) return "asistente";
  if (path.startsWith("/owner/inbox") || path.startsWith("/owner/activity")) return "conversaciones";
  if (path.startsWith("/owner/orders")) return "pedidos";
  if (path.startsWith("/owner/marketing")) return "marketing";
  if (path.startsWith("/owner/configuraciones") || path.startsWith("/owner/channels")) return "configuraciones";
  if (path.startsWith("/owner/settings")) return "ajustes";
  return "inicio";
}

export function isLabsNavigationItemActive(pathname: string, href: string) {
  const item = labsNavigationItems.find((candidate) => candidate.href === href);
  return Boolean(item && resolveLabsSection(pathname) === item.id);
}

export const labsSectionTitles: Record<LabsSectionId, { title: string; subtitle: string }> = {
  inicio: { title: "Vase Labs", subtitle: "Cómo viene tu asistente" },
  conversaciones: { title: "Conversaciones", subtitle: "Todo lo que llega por WhatsApp, Instagram y Messenger" },
  pedidos: { title: "Pedidos", subtitle: "Lo que tus clientes compraron por chat" },
  marketing: { title: "Marketing", subtitle: "Imágenes para vender, hechas con IA" },
  asistente: { title: "Asistente", subtitle: "Cómo habla, qué sabe y lo que le enseñaste" },
  configuraciones: { title: "Configuraciones", subtitle: "Plan de uso, canales, motor de IA y puntaje" },
  ajustes: { title: "Ajustes", subtitle: "Tu perfil, tu negocio y la facturación" },
};

/** Ajustes es igual en todos los productos: lo común vive en tu cuenta de Vase. Lo de Labs está en Configuraciones. */
export const LABS_SETTINGS_TABS = [
  // Mi perfil, Mi negocio y Facturación son de tu cuenta de Vase: se ven acá adentro, iguales que en app.
  { id: "perfil", label: "Mi perfil", href: "/owner/settings?tab=perfil" },
  { id: "negocio", label: "Mi negocio", href: "/owner/settings?tab=negocio" },
  { id: "facturacion", label: "Facturación", href: "/owner/settings?tab=facturacion" },
] as const;

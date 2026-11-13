import { House, MessagesSquare, ShoppingBag, Sparkles } from "lucide-react";

// Menú de Vase Labs: 4 entradas. Canales, plan y motor de IA están en Ajustes › Labs (botón de tu usuario).
// - Conversaciones: la bandeja y quién quiere comprar.
// - Asistente: cómo habla, qué sabe y lo que le enseñaron por WhatsApp.
export const labsNavigationGroups = [
  {
    label: "Principal",
    items: [
      { id: "inicio", href: "/anterior", label: "Inicio", icon: House },
      { id: "conversaciones", href: "/anterior/inbox", label: "Conversaciones", icon: MessagesSquare },
      { id: "pedidos", href: "/anterior/orders", label: "Pedidos", icon: ShoppingBag },
      { id: "asistente", href: "/anterior/knowledge", label: "Asistente", icon: Sparkles },
    ],
  },
] as const;

type LabsNavItem = (typeof labsNavigationGroups)[number]["items"][number];

export const labsNavigationItems: LabsNavItem[] = labsNavigationGroups.flatMap((group): LabsNavItem[] => [...group.items]);

export type LabsSectionId = LabsNavItem["id"] | "ajustes";

/** Qué entrada del menú corresponde a cada pantalla. */
export function resolveLabsSection(pathname: string): LabsSectionId {
  const path = pathname.replace(/\/+$/, "") || "/anterior";
  if (path.startsWith("/anterior/inbox/trainer") || path.startsWith("/anterior/knowledge")) return "asistente";
  if (path.startsWith("/anterior/inbox") || path.startsWith("/anterior/activity")) return "conversaciones";
  if (path.startsWith("/anterior/orders")) return "pedidos";
  if (path.startsWith("/anterior/channels") || path.startsWith("/anterior/settings")) return "ajustes";
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
  asistente: { title: "Asistente", subtitle: "Cómo habla, qué sabe y lo que le enseñaste" },
  ajustes: { title: "Ajustes", subtitle: "Tu perfil, tu negocio, la facturación y Labs" },
};

/** Ajustes es igual en todos los productos: lo común vive en tu cuenta de Vase y cada producto suma su pestaña. */
export const LABS_SETTINGS_TABS = [
  // Mi perfil, Mi negocio y Facturación son de tu cuenta de Vase: se ven acá adentro, iguales que en app.
  { id: "perfil", label: "Mi perfil", href: "/anterior/settings?tab=perfil" },
  { id: "negocio", label: "Mi negocio", href: "/anterior/settings?tab=negocio" },
  { id: "facturacion", label: "Facturación", href: "/anterior/settings?tab=facturacion" },
  { id: "labs", label: "Labs", href: "/anterior/settings" },
] as const;

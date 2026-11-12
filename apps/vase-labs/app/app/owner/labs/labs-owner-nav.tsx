import { House, MessagesSquare, ShoppingBag, Sparkles } from "lucide-react";

// Menú de Vase Labs: 4 entradas. Canales, plan y motor de IA están en Ajustes › Labs (botón de tu usuario).
// - Conversaciones: la bandeja y quién quiere comprar.
// - Asistente: cómo habla, qué sabe y lo que le enseñaron por WhatsApp.
export const labsNavigationGroups = [
  {
    label: "Principal",
    items: [
      { id: "inicio", href: "/owner", label: "Inicio", icon: House },
      { id: "conversaciones", href: "/owner/inbox", label: "Conversaciones", icon: MessagesSquare },
      { id: "pedidos", href: "/owner/orders", label: "Pedidos", icon: ShoppingBag },
      { id: "asistente", href: "/owner/knowledge", label: "Asistente", icon: Sparkles },
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
  if (path.startsWith("/owner/channels") || path.startsWith("/owner/settings")) return "ajustes";
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
const APP_SETTINGS = "https://app.vase.ar/app/settings";
export const LABS_SETTINGS_TABS = [
  { id: "perfil", label: "Mi perfil", href: `${APP_SETTINGS}?tab=perfil` },
  { id: "negocio", label: "Mi negocio", href: "/owner/settings?tab=negocio" },
  { id: "facturacion", label: "Facturación", href: `${APP_SETTINGS}?tab=facturacion` },
  { id: "labs", label: "Labs", href: "/owner/settings" },
] as const;

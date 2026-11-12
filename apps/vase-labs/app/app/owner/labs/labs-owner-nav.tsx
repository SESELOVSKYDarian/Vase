import { Cable, House, MessagesSquare, ShoppingBag, Sparkles } from "lucide-react";

// Menú de Vase Labs: 5 entradas. Cada una junta pantallas que antes estaban separadas.
// - Conversaciones: la bandeja y el análisis de cada cliente.
// - Qué sabe y cómo responde: conocimiento, catálogo, instrucciones y lo que le enseñan por WhatsApp.
export const labsNavigationGroups = [
  {
    label: "Principal",
    items: [
      { id: "inicio", href: "/owner", label: "Inicio", icon: House },
      { id: "conversaciones", href: "/owner/inbox", label: "Conversaciones", icon: MessagesSquare },
      { id: "pedidos", href: "/owner/orders", label: "Pedidos", icon: ShoppingBag },
    ],
  },
  {
    label: "Tu asistente",
    items: [
      { id: "asistente", href: "/owner/knowledge", label: "Qué sabe y cómo responde", icon: Sparkles },
      { id: "canales", href: "/owner/channels", label: "Canales", icon: Cable },
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
  if (path.startsWith("/owner/channels")) return "canales";
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
  asistente: { title: "Qué sabe y cómo responde", subtitle: "Lo que tu asistente sabe y cómo habla" },
  canales: { title: "Canales", subtitle: "Por dónde te escriben tus clientes" },
  ajustes: { title: "Ajustes de Labs", subtitle: "Plan, motor de IA y pedidos" },
};

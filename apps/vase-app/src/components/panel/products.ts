import type { PlatformModuleAccess, PlatformModuleKey } from "@/config/modules";
import { BUSINESS_WORKSPACE_PATH } from "@/lib/business/links";
import { resolveLabsHomeHref } from "@/lib/navigation/document-navigation";

export type PanelProduct = {
  key: PlatformModuleKey;
  name: string;
  mark: string;
  short: string;
  what: string;
  artBg: string;
  artFg: string;
  artTx: string;
  points: string[];
};

export const PANEL_PRODUCTS: Record<PlatformModuleKey, PanelProduct> = {
  business: {
    key: "business",
    name: "Vase Business",
    mark: "B",
    short: "Tu tienda online",
    what: "Tu tienda online: catálogo, pedidos y dominio propio.",
    artBg: "#0d3b2a",
    artFg: "#7ff0bd",
    artTx: "#ffffff",
    points: ["Tienda con tu diseño y tu dominio", "Catálogo, ofertas y listas de precios", "Pedidos, clientes y envíos"],
  },
  labs: {
    key: "labs",
    name: "Vase Labs",
    mark: "L",
    short: "Tu asistente de WhatsApp e Instagram",
    what: "Asistente con IA que responde por WhatsApp e Instagram.",
    artBg: "#241a5c",
    artFg: "#b9a7ff",
    artTx: "#ffffff",
    points: ["Responde solo, las 24 horas", "Tus canales en una sola bandeja", "Pasa a una persona cuando hace falta"],
  },
  management: {
    key: "management",
    name: "Vase Management",
    mark: "M",
    short: "Stock, ventas y caja",
    what: "Tu negocio ordenado: stock, ventas, compras y caja.",
    artBg: "#f6dfae",
    artFg: "#7c2d12",
    artTx: "#3b1a06",
    points: ["Productos, stock y clientes", "Compras, facturación y tesorería", "Reportes para decidir"],
  },
  rest: {
    key: "rest",
    name: "Vase Rest",
    mark: "R",
    short: "Salón, cocina y caja",
    what: "Para restaurantes: salón, cocina, caja y stock, con varias sucursales.",
    artBg: "#7a2e1d",
    artFg: "#ffe6d9",
    artTx: "#ffffff",
    points: ["Salón, cocina y caja conectados", "Sigue andando si se corta internet", "Varias sucursales"],
  },
};

export function panelProductHref(key: PlatformModuleKey) {
  switch (key) {
    case "business":
      return BUSINESS_WORKSPACE_PATH;
    case "labs":
      return resolveLabsHomeHref();
    case "management":
      return "/api/management/sso/start";
    case "rest":
      return "https://rest.vase.ar";
  }
}

export function formatArs(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

export type PanelPlan = { key: string; name: string; description: string; price: string };

export type PanelPlanPricing = { price: number; currency: string; type: string };

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function latestOfType(pricing: readonly PanelPlanPricing[], type: string) {
  return pricing.find((item) => item.type === type) ?? null;
}

/** Arma el precio de un plan con lo cargado en admin. Las filas vienen de la más nueva a la más vieja. */
export function formatPlanPrice(pricing: readonly PanelPlanPricing[]) {
  const oneTime = latestOfType(pricing, "ONE_TIME");
  const monthly = latestOfType(pricing, "MONTHLY");
  const yearly = latestOfType(pricing, "YEARLY");
  const recurring = monthly
    ? `${formatMoney(monthly.price, monthly.currency)} por mes`
    : yearly
      ? `${formatMoney(yearly.price, yearly.currency)} por año`
      : null;

  if (oneTime && recurring) return `${formatMoney(oneTime.price, oneTime.currency)} + ${recurring}`;
  if (oneTime) return formatMoney(oneTime.price, oneTime.currency);
  return recurring ?? "A consultar";
}

export function planSortAmount(pricing: readonly PanelPlanPricing[]) {
  const first = latestOfType(pricing, "ONE_TIME") ?? latestOfType(pricing, "MONTHLY") ?? latestOfType(pricing, "YEARLY");
  return first?.price ?? Number.MAX_SAFE_INTEGER;
}

export function panelProductPriceLabel(billing: PlatformModuleAccess["billing"]) {
  const { monthlyFrom, setupFrom, type, currency } = billing;
  if (type === "one_time" && setupFrom) return `Pago único, desde ${formatMoney(setupFrom, currency)}`;
  if (monthlyFrom) return `Por mes, desde ${formatMoney(monthlyFrom, currency)}`;
  return "A consultar";
}

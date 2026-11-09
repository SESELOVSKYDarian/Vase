export type WebCardTone = "g" | "y" | "r" | "";

const WEB_STATE: Record<string, { state: string; tone: WebCardTone }> = {
  ACTIVE: { state: "Publicada", tone: "g" },
  TEMPORARY: { state: "De prueba", tone: "y" },
  EXPIRED: { state: "Vencida", tone: "r" },
  PENDING_REMOVAL: { state: "Por eliminarse", tone: "r" },
  ARCHIVED: { state: "Archivada", tone: "" },
};

export function describeWebState(status: string) {
  return WEB_STATE[status] ?? { state: "Borrador", tone: "" as WebCardTone };
}

const WEB_PALETTE = [
  { bg: "#d9f7e9", accent: "#0d3b2a" },
  { bg: "#e7e3ff", accent: "#241a5c" },
  { bg: "#fdeccf", accent: "#b45309" },
  { bg: "#ffe6d9", accent: "#7a2e1d" },
  { bg: "#dcecff", accent: "#175cd3" },
];

/** Un color fijo por posición, para que cada web se distinga de un vistazo. */
export function webPalette(index: number) {
  return WEB_PALETTE[Math.abs(index) % WEB_PALETTE.length];
}

export function webLimitText(count: number, limit: number | null) {
  if (limit === null) return count === 1 ? "Tenés 1 web." : `Tenés ${count} webs.`;
  return `Tenés ${count} de ${limit} webs de tu plan.`;
}

export function webRemainingText(count: number, limit: number | null) {
  if (limit === null) return "Sumá las que necesites";
  const left = Math.max(0, limit - count);
  if (left === 0) return "Llegaste al límite de tu plan";
  return left === 1 ? "Te queda 1 en tu plan" : `Te quedan ${left} en tu plan`;
}

/**
 * El pedido a medida guarda estos datos como obligatorios y el equipo los usa en admin.
 * En el panel nuevo se conversan en la reunión, así que van con este texto.
 */
export const CUSTOM_WEB_DEFAULTS = {
  businessDescription: "Se define en la reunión de definición.",
  desiredColors: "Se define en la reunión.",
  brandStyle: "Se define en la reunión.",
  desiredFeatures: "Se define en la reunión.",
};

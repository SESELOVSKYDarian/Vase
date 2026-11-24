/** Anuncios: dónde se muestran, íconos y colores. Sirve en servidor y en cliente. */

export const ANNOUNCEMENT_SURFACES = [
  { id: "app", label: "App", hint: "app.vase.ar" },
  { id: "business", label: "Business", hint: "Tienda y panel" },
  { id: "labs", label: "Labs", hint: "Asistente e inbox" },
  { id: "management", label: "Management", hint: "Gestión" },
  { id: "rest", label: "Rest", hint: "Restaurantes" },
] as const;

export type AnnouncementSurface = (typeof ANNOUNCEMENT_SURFACES)[number]["id"];

export const ANNOUNCEMENT_ICONS = ["sparkles", "rocket", "gift", "megaphone", "party", "star", "zap", "bell", "heart", "info"] as const;
export type AnnouncementIcon = (typeof ANNOUNCEMENT_ICONS)[number];

/** Colores del encabezado del anuncio. Fondo degradado + color del ícono. */
export const ANNOUNCEMENT_ACCENTS = {
  green: { label: "Verde Vase", from: "#0b6b4a", to: "#16a36f" },
  ink: { label: "Noche", from: "#111827", to: "#334155" },
  violet: { label: "Violeta", from: "#5b21b6", to: "#8b5cf6" },
  sky: { label: "Cielo", from: "#0369a1", to: "#38bdf8" },
  sun: { label: "Sol", from: "#c2410c", to: "#f59e0b" },
  rose: { label: "Rosa", from: "#be185d", to: "#fb7185" },
} as const;
export type AnnouncementAccent = keyof typeof ANNOUNCEMENT_ACCENTS;

export function isAnnouncementSurface(value: string): value is AnnouncementSurface {
  return ANNOUNCEMENT_SURFACES.some((surface) => surface.id === value);
}

export function accentOf(value: string | null | undefined) {
  return ANNOUNCEMENT_ACCENTS[(value ?? "green") as AnnouncementAccent] ?? ANNOUNCEMENT_ACCENTS.green;
}

/** Lo que llega a la ventana del anuncio. La imagen se pide aparte por su ruta. */
export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  icon: string | null;
  accent: string | null;
  imageUrl: string | null;
};

/** Solo links http(s) o rutas internas. */
export function safeAnnouncementUrl(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw.slice(0, 500);
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

import type { MetadataRoute } from "next";
import { portalOrigins } from "@/config/origins";
import { PUBLIC_ROUTES } from "@/config/redirects";

// Mapa de vase.ar. Sin fecha de modificación inventada: Google la ignora si siempre dice "hoy".
// Las notas tienen su propio mapa en news.vase.ar/sitemap.xml.
const MAIN_ROUTES = new Set(["/", "/vase-business", "/vaselabs", "/vase-management", "/precios"]);

/** Mapa del sitio de vase.ar para Google, con la prioridad de cada página. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${portalOrigins.publicSite}${route === "/" ? "" : route}`,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : MAIN_ROUTES.has(route) ? 0.9 : 0.6,
  }));
}

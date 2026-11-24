import { cookies } from "next/headers";
import { appConfig, type AppLocale } from "@/config/app";

/**
 * Idioma del sitio público. vase.ar no tiene selector de idioma y la cookie "vase-locale" la pone app.vase.ar solo
 * para su propio dominio, así que acá siempre se usa el idioma por defecto. No leer cookies permite que las páginas
 * públicas se armen de antemano (más rápidas para la gente y para Google).
 */
export async function getRequestLocale(): Promise<AppLocale> {
  return appConfig.defaultLocale;
}

/** Idioma pedido por cookie (para el día que vase.ar tenga selector de idioma). */
export async function getCookieLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("vase-locale")?.value;
  return locale === "es" || locale === "en" ? locale : appConfig.defaultLocale;
}

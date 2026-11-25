import { getMarketingChromeCopy } from "@/config/public-site";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { SiteHeaderClient } from "./site-header-client";

/** Menú de arriba de vase.ar con los textos en el idioma de la página. */
export async function SiteHeader() {
  const locale = await getRequestLocale();
  const copy = getMarketingChromeCopy(locale);
  return <SiteHeaderClient copy={copy} />;
}

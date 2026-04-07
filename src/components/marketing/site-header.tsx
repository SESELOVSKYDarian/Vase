import { getMarketingChromeCopy } from "@/config/public-site";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const locale = await getRequestLocale();
  const copy = getMarketingChromeCopy(locale);
  return <SiteHeaderClient copy={copy} />;
}

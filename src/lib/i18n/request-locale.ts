import { cookies } from "next/headers";
import { appConfig, type AppLocale } from "@/config/app";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("vase-locale")?.value;

  if (locale === "es" || locale === "en") {
    return locale;
  }

  return appConfig.defaultLocale;
}

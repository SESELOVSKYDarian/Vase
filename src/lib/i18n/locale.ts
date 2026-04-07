import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { appConfig, type AppLocale } from "@/config/app";

export function resolveLocale(headers: Headers): AppLocale {
  const negotiatorHeaders = Object.fromEntries(headers.entries());
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return match(languages, [...appConfig.locales], appConfig.defaultLocale) as AppLocale;
}

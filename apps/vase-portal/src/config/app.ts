export const appConfig = {
  name: "Vase",
  description: "Plataforma digital para negocios reales.",
  locales: ["es", "en"] as const,
  defaultLocale: "es" as const,
};

export type AppLocale = (typeof appConfig.locales)[number];

type ProductOriginInput = {
  publicSite?: string;
  app?: string;
  labs?: string;
};

function normalizeOrigin(value: string | undefined, fallback: string) {
  return new URL(value?.trim() || fallback).origin;
}

export function resolveProductOrigins(input: ProductOriginInput) {
  return {
    publicSite: normalizeOrigin(input.publicSite, "https://vase.ar"),
    app: normalizeOrigin(input.app, "https://app.vase.ar"),
    labs: normalizeOrigin(input.labs, "https://labs.vase.ar"),
  };
}

export const productOrigins = resolveProductOrigins({
  publicSite: process.env.NEXT_PUBLIC_PUBLIC_SITE_ORIGIN,
  app: process.env.NEXT_PUBLIC_APP_URL,
  labs: process.env.NEXT_PUBLIC_LABS_URL,
});

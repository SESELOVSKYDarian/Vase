type PortalOriginInput = {
  publicSite?: string;
  app?: string;
  appInternal?: string;
};

/** Deja solo el dominio de una dirección (sin ruta). Si viene vacía, usa la de respaldo. */
function normalizeOrigin(value: string | undefined, fallback: string) {
  return new URL(value?.trim() || fallback).origin;
}

/** Direcciones de cada servicio de Vase (sitio, app, Labs…) según la configuración, con valores de respaldo. */
export function resolvePortalOrigins(input: PortalOriginInput) {
  const app = normalizeOrigin(input.app, "https://app.vase.ar");

  return {
    publicSite: normalizeOrigin(input.publicSite, "https://vase.ar"),
    app,
    appInternal: normalizeOrigin(input.appInternal, app),
  };
}

export const portalOrigins = resolvePortalOrigins({
  publicSite: process.env.NEXT_PUBLIC_PUBLIC_SITE_ORIGIN,
  app: process.env.NEXT_PUBLIC_APP_URL,
  appInternal: process.env.APP_INTERNAL_URL,
});

export const APP_SIGN_IN_URL = `${portalOrigins.app}/signin`;
export const APP_REGISTER_URL = `${portalOrigins.app}/register`;

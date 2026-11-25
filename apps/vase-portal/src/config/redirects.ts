export const PUBLIC_ROUTES = [
  "/",
  "/contact",
  "/demo",
  "/developers/api",
  "/developers/docs",
  "/integraciones",
  "/politica-de-privacidad",
  "/precios",
  "/preguntas-frecuentes",
  "/que-es-vase",
  "/seguridad",
  "/terminos-y-condiciones",
  "/vase-business",
  "/vase-management",
  "/vaselabs",
] as const;

/** Direcciones viejas del sitio que se mandan a la app o a su página nueva. */
export function getPortalRedirects(appOrigin: string) {
  return [
    {
      source: "/app",
      destination: `${appOrigin}/app`,
      permanent: true,
    },
    {
      source: "/app/:path*",
      destination: `${appOrigin}/app/:path*`,
      permanent: true,
    },
    {
      source: "/signin",
      destination: `${appOrigin}/signin`,
      permanent: true,
    },
    {
      source: "/register",
      destination: `${appOrigin}/register`,
      permanent: true,
    },
    {
      source: "/forgot-password",
      destination: `${appOrigin}/forgot-password`,
      permanent: true,
    },
    {
      source: "/reset-password",
      destination: `${appOrigin}/reset-password`,
      permanent: true,
    },
    {
      source: "/verify-email",
      destination: `${appOrigin}/verify-email`,
      permanent: true,
    },
    {
      source: "/api/openapi.json",
      destination: `${appOrigin}/api/openapi.json`,
      permanent: false,
    },
  ];
}

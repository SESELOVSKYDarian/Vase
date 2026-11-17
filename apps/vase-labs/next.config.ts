import type { NextConfig } from "next";

// Cabeceras de seguridad en todas las respuestas.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
];

// Nadie puede mostrar Labs adentro de otra página, salvo /embed/* adentro de app.vase.ar.
const appOrigin = (process.env.NEXT_PUBLIC_VASE_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");
const frameHeaders = [
  { source: "/", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
  { source: "/:first((?!embed$)[^/]+)/:rest*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
  { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' ${appOrigin}` }] },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Una sección ya visitada se muestra al instante si volvés dentro de 30 segundos, sin volver a cargarla.
  // Cuando guardás algo, la sección se actualiza igual.
  experimental: { staleTimes: { dynamic: 30 } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }, ...frameHeaders];
  },
  async redirects() {
    return [
      {
        source: "/app/owner/labs/integrations",
        destination: "/owner/channels",
        permanent: true,
      },
      {
        source: "/app/owner/labs/chatbots",
        destination: "/owner/knowledge",
        permanent: true,
      },
      {
        source: "/app/owner/labs/setup",
        destination: "/owner/settings",
        permanent: true,
      },
      {
        source: "/app/owner/labs/:path*",
        destination: "/owner/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const mercadoPagoHosts = ["https://*.mercadopago.com", "https://*.mercadolibre.com", "https://*.mlstatic.com"];
const scriptSrc = ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com", ...mercadoPagoHosts];
const connectSrc = ["'self'", "https:"];

if (isDevelopment) {
  scriptSrc.push("'unsafe-eval'");
  connectSrc.push("http:", "ws:", "wss:");
}

// Productos de Vase que pueden mostrar páginas de app adentro suyo (Ajustes compartidos: /app/embed/...).
const embedAncestors = ["'self'", "https://business.vase.ar", "https://labs.vase.ar"];
for (const value of [process.env.BUSINESS_PUBLIC_URL, process.env.LABS_PUBLIC_URL]) {
  try {
    if (value) embedAncestors.push(new URL(value).origin);
  } catch {
    // una URL mal cargada no abre la puerta a otros sitios
  }
}

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src ${connectSrc.join(" ")}`,
  `frame-src 'self' ${mercadoPagoHosts.join(" ")}`,
  "media-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
  "block-all-mixed-content",
];
const contentSecurityPolicy = cspDirectives.join("; ");
// Igual, pero dejando que Business y Labs muestren la página. frame-ancestors le gana a X-Frame-Options.
const embedContentSecurityPolicy = cspDirectives
  .map((directive) => (directive === "frame-ancestors 'self'" ? `frame-ancestors ${embedAncestors.join(" ")}` : directive))
  .join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  ...(process.env.NEXT_DEPLOYMENT_ID
    ? {
        deploymentId: process.env.NEXT_DEPLOYMENT_ID,
        generateBuildId: async () => process.env.NEXT_DEPLOYMENT_ID as string,
      }
    : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "60mb",
    },
    proxyClientMaxBodySize: "60mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
      {
        // Ajustes compartidos: se pueden mostrar adentro de Business y Labs (nada más).
        // Pisa la CSP de arriba y deja X-Frame-Options en ALLOWALL, que los navegadores ignoran
        // porque frame-ancestors manda.
        source: "/app/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: embedContentSecurityPolicy },
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
};

export default nextConfig;

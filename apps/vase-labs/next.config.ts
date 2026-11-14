import type { NextConfig } from "next";

// Cabeceras de seguridad en todas las respuestas.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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

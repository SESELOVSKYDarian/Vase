const deploymentId = process.env.NEXT_DEPLOYMENT_ID || process.env.DEPLOYMENT_VERSION;
const managementPublicUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://management.vase.ar";

function getHostWithPort(value, fallback) {
  try {
    return new URL(value).host;
  } catch {
    return fallback;
  }
}

const managementPublicHost = getHostWithPort(
  managementPublicUrl,
  "management.vase.ar",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  ...(deploymentId
    ? {
        deploymentId,
        generateBuildId: async () => deploymentId,
      }
    : {}),
  poweredByHeader: false,
  // Next 14 no tiene arreglo para las fallas del optimizador de imágenes (ejecución de código con
  // AVIF o SVG): se apaga y se cierra su dirección. Las imágenes se sirven tal cual.
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/_next/image", destination: "/_imagen-no-disponible" }] };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3006", "management.vase.ar", managementPublicHost],
    },
  },
};

export default nextConfig;

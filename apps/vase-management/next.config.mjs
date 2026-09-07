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
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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

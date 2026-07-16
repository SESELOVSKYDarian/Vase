import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

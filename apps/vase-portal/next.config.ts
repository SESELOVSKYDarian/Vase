import type { NextConfig } from "next";
import { portalOrigins } from "./src/config/origins";
import { getPortalRedirects } from "./src/config/redirects";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  async redirects() {
    return getPortalRedirects(portalOrigins.app);
  },
};

export default nextConfig;

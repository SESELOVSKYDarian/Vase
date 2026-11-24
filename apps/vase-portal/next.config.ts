import type { NextConfig } from "next";
import { getNewsRedirects, getNewsRewrites, getWwwRedirects } from "./src/config/news-routing";
import { portalOrigins } from "./src/config/origins";
import { getPortalRedirects } from "./src/config/redirects";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  async redirects() {
    return [...getWwwRedirects(portalOrigins.publicSite), ...getNewsRedirects(portalOrigins.publicSite), ...getPortalRedirects(portalOrigins.app)];
  },
  async rewrites() {
    // beforeFiles: en news.vase.ar la portada "/" tiene que ser la de novedades, no la de vase.ar.
    return { beforeFiles: getNewsRewrites(), afterFiles: [], fallback: [] };
  },
};

export default nextConfig;

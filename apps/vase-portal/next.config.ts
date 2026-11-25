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
  async headers() {
    // Solo vase.ar y news.vase.ar se indexan. Copias del sitio en otros dominios (test.vase.ar, *.easypanel.host)
    // no tienen que competir en Google con el sitio real. Los dominios van fijos a propósito: el entorno de prueba
    // usa otro NEXT_PUBLIC_PUBLIC_SITE_ORIGIN.
    return [
      {
        source: "/:path*",
        missing: [
          { type: "host", value: "vase.ar" },
          { type: "host", value: "news.vase.ar" },
        ],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async rewrites() {
    // beforeFiles: en news.vase.ar la portada "/" tiene que ser la de novedades, no la de vase.ar.
    return { beforeFiles: getNewsRewrites(), afterFiles: [], fallback: [] };
  },
};

export default nextConfig;

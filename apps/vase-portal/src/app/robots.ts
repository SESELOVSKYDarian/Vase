import type { MetadataRoute } from "next";
import { portalOrigins } from "@/config/origins";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${portalOrigins.publicSite}/sitemap.xml`,
  };
}

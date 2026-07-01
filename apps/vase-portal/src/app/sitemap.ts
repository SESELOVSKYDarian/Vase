import type { MetadataRoute } from "next";
import { portalOrigins } from "@/config/origins";
import { PUBLIC_ROUTES } from "@/config/redirects";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${portalOrigins.publicSite}${route === "/" ? "" : route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}

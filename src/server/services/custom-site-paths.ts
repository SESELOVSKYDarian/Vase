import { join } from "node:path";

export function getCustomSitesBaseDir() {
  return join(/*turbopackIgnore: true*/ process.cwd(), "uploads", "custom-sites");
}

export function getCustomSitePublicBasePath(siteId: string) {
  return `/api/custom-sites/${encodeURIComponent(siteId)}`;
}

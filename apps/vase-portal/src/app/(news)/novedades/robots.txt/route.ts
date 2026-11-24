import { NEWS_ORIGIN } from "@/config/news";

// robots.txt de news.vase.ar (en ese dominio se sirve como /robots.txt; ver news-routing.ts).
export const dynamic = "force-static";

export function GET() {
  const body = ["User-agent: *", "Allow: /", "Disallow: /api/", "", `Sitemap: ${NEWS_ORIGIN}/sitemap.xml`, ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

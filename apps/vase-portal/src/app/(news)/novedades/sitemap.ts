import type { MetadataRoute } from "next";
import { NEWS_ARTICLES, newsUrl } from "@/config/news";

// Mapa de news.vase.ar (en ese dominio se sirve como /sitemap.xml; ver news-routing.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const latest = NEWS_ARTICLES.reduce((max, article) => (article.date > max ? article.date : max), "2026-01-01");
  return [
    { url: newsUrl(), lastModified: new Date(`${latest}T12:00:00Z`), changeFrequency: "weekly", priority: 1 },
    ...NEWS_ARTICLES.map((article) => ({
      url: newsUrl(article.slug),
      lastModified: new Date(`${article.date}T12:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [new URL(article.cover.src, newsUrl()).toString()],
    })),
  ];
}

// news.vase.ar sale del mismo Portal: la portada es /novedades y cada nota /novedades/<slug>.
// Lo que no es una nota (precios, contacto, etc.) vuelve a vase.ar.
import { NEWS_ARTICLES, NEWS_HOST } from "./news";
import { PUBLIC_ROUTES } from "./redirects";

const onNews = [{ type: "host" as const, value: NEWS_HOST }];

export function getNewsRewrites() {
  return [
    { source: "/", has: onNews, destination: "/novedades" },
    ...NEWS_ARTICLES.map((article) => ({ source: `/${article.slug}`, has: onNews, destination: `/novedades/${article.slug}` })),
  ];
}

export function getNewsRedirects(publicSite: string) {
  return [
    { source: "/novedades", has: onNews, destination: "/", permanent: false },
    { source: "/novedades/:slug([a-z0-9-]+)", has: onNews, destination: "/:slug", permanent: false },
    ...PUBLIC_ROUTES.filter((route) => route !== "/").map((route) => ({
      source: route,
      has: onNews,
      destination: `${publicSite}${route}`,
      permanent: false,
    })),
  ];
}

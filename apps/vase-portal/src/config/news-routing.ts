// news.vase.ar sale del mismo Portal: la portada es /novedades y cada nota /novedades/<slug>.
// Lo que no es una nota (precios, contacto, etc.) vuelve a vase.ar.
import { NEWS_ARTICLES, NEWS_HOST } from "./news";
import { PUBLIC_ROUTES } from "./redirects";

const onNews = [{ type: "host" as const, value: NEWS_HOST }];

/** En news.vase.ar, sirve las páginas de /novedades directo desde la raíz (y su mapa del sitio y robots). */
export function getNewsRewrites() {
  return [
    { source: "/", has: onNews, destination: "/novedades" },
    // news.vase.ar tiene su propio mapa del sitio y robots.txt.
    { source: "/sitemap.xml", has: onNews, destination: "/novedades/sitemap.xml" },
    { source: "/robots.txt", has: onNews, destination: "/novedades/robots.txt" },
    ...NEWS_ARTICLES.map((article) => ({ source: `/${article.slug}`, has: onNews, destination: `/novedades/${article.slug}` })),
  ];
}

/** www.vase.ar → vase.ar (una sola dirección para Google). */
export function getWwwRedirects(publicSite: string) {
  const host = new URL(publicSite).host;
  return [{ source: "/:path*", has: [{ type: "host" as const, value: `www.${host}` }], destination: `${publicSite}/:path*`, permanent: true }];
}

/** En news.vase.ar, manda las direcciones viejas a la nueva y las páginas del sitio principal a vase.ar. */
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

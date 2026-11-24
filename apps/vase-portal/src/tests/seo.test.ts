import { describe, expect, it } from "vitest";
import { getNewsRewrites, getWwwRedirects } from "@/config/news-routing";
import { PUBLIC_ROUTES } from "@/config/redirects";
import { PAGE_SEO, jsonLdScript, pageMetadata } from "@/config/seo";

describe("SEO del sitio público", () => {
  it("cada página pública tiene título y descripción propios", () => {
    for (const route of PUBLIC_ROUTES) expect(PAGE_SEO).toHaveProperty(route);
    const titles = Object.values(PAGE_SEO).map((page) => page.title);
    const descriptions = Object.values(PAGE_SEO).map((page) => page.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const description of descriptions) expect(description.length).toBeLessThanOrEqual(170);
  });

  it("marca la dirección oficial y la imagen para compartir", () => {
    const meta = pageMetadata("/vase-business");
    expect(meta.alternates?.canonical).toBe("https://vase.ar/vase-business");
    expect(JSON.stringify(meta.openGraph)).toContain("/og/business.jpg");
  });

  it("los datos estructurados no pueden cerrar la etiqueta script", () => {
    expect(jsonLdScript({ name: "</script><b>" })).not.toContain("</script>");
  });

  it("www.vase.ar lleva a vase.ar y news.vase.ar tiene su propio mapa", () => {
    expect(getWwwRedirects("https://vase.ar")[0]).toMatchObject({ destination: "https://vase.ar/:path*", permanent: true, has: [{ type: "host", value: "www.vase.ar" }] });
    expect(getNewsRewrites()).toEqual(expect.arrayContaining([expect.objectContaining({ source: "/sitemap.xml", destination: "/novedades/sitemap.xml" })]));
  });
});

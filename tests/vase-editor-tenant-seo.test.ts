import { describe, expect, it } from "vitest";
import {
  PIQUIM_SEO_DEFAULTS,
  applyTenantSeoDefaults,
  buildFaviconLinks,
  buildRobotsTxt,
  buildSitemapXml,
  buildStructuredData,
  cleanDescription,
  isAssetLikePath,
  isPiquimTenant,
  renderJsonLd,
  renderLinkTags,
  resolveRequestOrigin,
  toAbsoluteUrl,
} from "../apps/vase-editor/server/src/services/tenantSeo.js";

const piquim = { name: "PIQUIM", external_tenant_slug: "piquim" };
const teflon = { name: "Sanitarios El Teflon", external_tenant_slug: "teflon" };

const fakeReq = (headers: Record<string, string>, protocol = "http") => ({
  get: (name: string) => headers[name.toLowerCase()],
  protocol,
});

describe("tenant SEO defaults", () => {
  it("detects Piquim by name, slug or preset", () => {
    expect(isPiquimTenant(piquim)).toBe(true);
    expect(isPiquimTenant({ name: "Otra" }, { design_preset: "piquim" })).toBe(true);
    expect(isPiquimTenant(teflon)).toBe(false);
  });

  it("fills only empty SEO fields for Piquim and keeps what the admin panel saved", () => {
    const empty = applyTenantSeoDefaults({ title: "", description: "  ", indexable: true }, piquim, {});
    expect(empty.title).toBe(PIQUIM_SEO_DEFAULTS.title);
    expect(empty.description).toBe(PIQUIM_SEO_DEFAULTS.description);
    expect(empty.ogTitle).toBe(PIQUIM_SEO_DEFAULTS.title);
    expect(empty.favicon_url).toBe(PIQUIM_SEO_DEFAULTS.faviconUrl);
    expect(empty.indexable).toBe(true);

    const custom = applyTenantSeoDefaults({ title: "Mi titulo", description: "Mi texto", ogTitle: "OG" }, piquim, {});
    expect(custom.title).toBe("Mi titulo");
    expect(custom.description).toBe("Mi texto");
    expect(custom.ogTitle).toBe("OG");
    expect(custom.ogDescription).toBe("Mi texto");
  });

  it("does not change other tenants", () => {
    const seo = { title: "", description: "" };
    expect(applyTenantSeoDefaults(seo, teflon, {})).toBe(seo);
    expect(applyTenantSeoDefaults(undefined, teflon, {})).toEqual({});
  });

  it("keeps the default title and description within Google limits", () => {
    expect(PIQUIM_SEO_DEFAULTS.title.length).toBeLessThanOrEqual(60);
    expect(PIQUIM_SEO_DEFAULTS.description.length).toBeLessThanOrEqual(165);
    expect(PIQUIM_SEO_DEFAULTS.description).toContain("Materia prima que inspira cada receta");
  });
});

describe("favicon links", () => {
  it("uses the Piquim icon set when no favicon was uploaded", () => {
    const links = buildFaviconLinks({ branding: {}, seo: {}, tenant: piquim });
    expect(links.map((link) => link.href)).toEqual([
      "/piquim/favicon-48.png",
      "/piquim/favicon-96.png",
      "/piquim/favicon-192.png",
      "/piquim/apple-touch-icon.png",
    ]);
  });

  it("prefers the favicon configured in the panel and serves data URIs through /favicon.ico", () => {
    expect(buildFaviconLinks({ branding: { favicon_url: "https://cdn.example.com/f.png" }, tenant: piquim })).toEqual([
      { rel: "icon", href: "https://cdn.example.com/f.png" },
    ]);
    expect(buildFaviconLinks({ branding: { favicon_url: "data:image/png;base64,AAAA" }, tenant: teflon })).toEqual([
      { rel: "icon", href: "/favicon.ico" },
    ]);
    expect(buildFaviconLinks({ branding: {}, seo: {}, tenant: teflon })).toEqual([]);
  });

  it("renders absolute and escaped link tags", () => {
    const html = renderLinkTags([{ rel: "icon", sizes: "48x48", href: '/a"b.png' }], "https://piquim.ar");
    expect(html).toBe('<link rel="icon" sizes="48x48" href="https://piquim.ar/a&quot;b.png" />');
  });
});

describe("request origin and urls", () => {
  it("builds an https origin from the forwarded host and rejects odd hosts", () => {
    expect(resolveRequestOrigin(fakeReq({ "x-forwarded-host": "piquim.ar, proxy.local" }))).toBe("https://piquim.ar");
    expect(resolveRequestOrigin(fakeReq({ host: "PIQUIM.ar" }))).toBe("https://piquim.ar");
    expect(resolveRequestOrigin(fakeReq({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(resolveRequestOrigin(fakeReq({ host: 'evil.com"><script>' }))).toBe("");
    expect(resolveRequestOrigin(fakeReq({}))).toBe("");
  });

  it("makes relative urls absolute", () => {
    expect(toAbsoluteUrl("https://piquim.ar", "/catalog")).toBe("https://piquim.ar/catalog");
    expect(toAbsoluteUrl("https://piquim.ar", "catalog")).toBe("https://piquim.ar/catalog");
    expect(toAbsoluteUrl("https://piquim.ar", "https://otro.com/x")).toBe("https://otro.com/x");
    expect(toAbsoluteUrl("", "/x")).toBe("/x");
  });

  it("treats paths with a file extension as assets", () => {
    for (const path of ["/robots.txt", "/piquim/falta.png", "/a/b.js"]) expect(isAssetLikePath(path)).toBe(true);
    for (const path of ["/", "/catalog", "/product/123", "/sobre-nosotros"]) expect(isAssetLikePath(path)).toBe(false);
  });
});

describe("structured data, robots and sitemap", () => {
  it("describes the organization with only valid social links", () => {
    const data = buildStructuredData({
      tenant: piquim,
      branding: { name: "Piquim", footer: { socials: [{ href: "https://instagram.com/piquim" }, { href: "javascript:x" }, { href: "" }] } },
      seo: { description: "Texto" },
      origin: "https://piquim.ar",
    }) as { "@graph": Array<Record<string, unknown>> };

    const organization = data["@graph"][0];
    expect(organization.name).toBe("Piquim");
    expect(organization.sameAs).toEqual(["https://instagram.com/piquim"]);
    expect(organization.logo).toBe("https://piquim.ar/piquim/favicon-192.png");
    expect(buildStructuredData({ tenant: piquim, origin: "" })).toBeNull();
  });

  it("cannot break out of the JSON-LD script tag", () => {
    const html = renderJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).toContain("\\u003c/script>");
  });

  it("cleans and trims descriptions", () => {
    expect(cleanDescription("<p>Hola   <b>mundo</b></p>")).toBe("Hola mundo");
    const long = cleanDescription("palabra ".repeat(60));
    expect(long.length).toBeLessThanOrEqual(155);
    expect(long.endsWith("…")).toBe(true);
  });

  it("writes robots.txt with private areas, the sitemap and noindex support", () => {
    const robots = buildRobotsTxt({ origin: "https://piquim.ar" });
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /checkout");
    expect(robots).toContain("Sitemap: https://piquim.ar/sitemap.xml");
    expect(buildRobotsTxt({ origin: "https://piquim.ar", indexable: false })).toBe("User-agent: *\nDisallow: /\n");
  });

  it("writes a valid escaped sitemap", () => {
    const xml = buildSitemapXml({
      origin: "https://piquim.ar",
      entries: [
        { path: "/", changefreq: "weekly", priority: "1.0" },
        { path: "/product/a&b", lastmod: "2026-10-20T12:00:00Z" },
      ],
    });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<loc>https://piquim.ar/</loc>");
    expect(xml).toContain("<loc>https://piquim.ar/product/a&amp;b</loc>");
    expect(xml).toContain("<lastmod>2026-10-20</lastmod>");
  });
});

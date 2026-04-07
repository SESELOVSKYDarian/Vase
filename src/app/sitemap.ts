import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vase.ar";
  const routes = [
    "",
    "/que-es-vase",
    "/vase-business",
    "/vaselabs",
    "/integraciones",
    "/developers/api",
    "/precios",
    "/preguntas-frecuentes",
    "/demo",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}

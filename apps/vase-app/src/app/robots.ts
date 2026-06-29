import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vase.ar";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/que-es-vase", "/vase-business", "/vaselabs", "/integraciones", "/precios"],
        disallow: ["/app/", "/api/", "/signin", "/register", "/forgot-password", "/reset-password"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

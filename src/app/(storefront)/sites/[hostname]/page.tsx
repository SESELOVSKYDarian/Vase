import { notFound } from "next/navigation";
import { PublicStorefront } from "@/components/business/public-storefront";
import { getStorefrontByHostname } from "@/server/queries/storefront";

export default async function StorefrontHostnamePage({
  params,
}: {
  params: Promise<{ hostname: string; slug?: string[] }>;
}) {
  const { hostname, slug } = await params;
  
  // Por ahora, buscamos el sitio basándonos en el hostname principal.
  // En una versión futura, usaremos 'slug' para navegar entre las páginas internas del sitio.
  const site = await getStorefrontByHostname(hostname);

  if (!site) {
    notFound();
  }

  return (
    <PublicStorefront document={site.document} />
  );
}

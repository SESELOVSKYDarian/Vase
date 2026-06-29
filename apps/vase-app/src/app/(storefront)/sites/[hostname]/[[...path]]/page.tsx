import { notFound } from "next/navigation";
import { PublicStorefront } from "@/components/business/public-storefront";
import { getStorefrontByHostname } from "@/server/queries/storefront";

export const dynamic = "force-dynamic";

export default async function StorefrontHostnamePage({
  params,
}: {
  params: Promise<{ hostname: string; path?: string[] }>;
}) {
  const { hostname, path } = await params;
  
  const site = await getStorefrontByHostname(hostname);

  if (!site) {
    notFound();
  }

  // Pass the optional path down so the public storefront iframe can reflect it
  return (
    <PublicStorefront document={site.document} currentPath={path ? '/' + path.join('/') : ''} />
  );
}

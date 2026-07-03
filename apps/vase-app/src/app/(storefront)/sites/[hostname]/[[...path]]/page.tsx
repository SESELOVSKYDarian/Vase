import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicStorefront } from "@/components/business/public-storefront";
import { getStorefrontByHostname } from "@/server/queries/storefront";

export const dynamic = "force-dynamic";

function buildStorefrontUrl(hostname: string, path?: string[]) {
  const pathname = path && path.length > 0 ? `/${path.join("/")}` : "/";
  return `https://${hostname}${pathname}`;
}

function normalizeCanonicalUrl(hostname: string, path?: string[], canonicalPath?: string | null) {
  const fallbackUrl = buildStorefrontUrl(hostname, path);
  if (!canonicalPath?.trim()) {
    return fallbackUrl;
  }

  if (/^https?:\/\//i.test(canonicalPath)) {
    return canonicalPath;
  }

  return `https://${hostname}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hostname: string; path?: string[] }>;
}): Promise<Metadata> {
  const { hostname, path } = await params;
  const site = await getStorefrontByHostname(hostname);

  if (!site) {
    return {};
  }

  const canonicalUrl = normalizeCanonicalUrl(hostname, path, site.document.seo.canonicalPath);
  const indexable = site.document.seo.indexable !== false;

  return {
    title: site.document.seo.title,
    description: site.document.seo.description ?? undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: indexable,
      follow: indexable,
    },
    openGraph: {
      title: site.document.seo.ogTitle ?? site.document.seo.title,
      description: site.document.seo.ogDescription ?? site.document.seo.description ?? undefined,
      url: canonicalUrl,
      type: "website",
    },
  };
}

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

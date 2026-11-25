import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type CatalogProductFilters = {
  ids?: string[];
  slug?: string;
  sku?: string;
  search?: string;
  categorySlug?: string;
  collectionSlug?: string;
  publicOnly?: boolean;
  onlyFeatured?: boolean;
  take?: number;
};

export function catalogProductInclude(tenantId: string) {
  return {
    categories: {
      include: {
        category: true,
      },
    },
    collections: {
      include: {
        collection: true,
      },
    },
    reviews: {
      where: {
        status: ReviewStatus.PUBLISHED,
      },
      orderBy: {
        createdAt: "desc" as const,
      },
      take: 5,
    },
    priceOverrides: {
      where: {
        tenantId,
      },
      take: 1,
    },
  };
}

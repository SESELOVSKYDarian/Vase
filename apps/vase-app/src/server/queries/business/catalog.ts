import { ProductStatus, ReviewStatus } from "@prisma/client";
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

export async function listCatalogProductsByTenant(tenantId: string, filters: CatalogProductFilters = {}) {
  const search = filters.search?.trim();

  return prisma.product.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: ProductStatus.ACTIVE,
      ...(filters.publicOnly
        ? {
            isVisibleWeb: true,
            isActiveSource: true,
          }
        : {}),
      ...(filters.ids?.length ? { id: { in: filters.ids } } : {}),
      ...(filters.slug ? { slug: filters.slug } : {}),
      ...(filters.sku ? { sku: filters.sku } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
              { brand: { contains: search } },
            ],
          }
        : {}),
      ...(filters.categorySlug
        ? {
            categories: {
              some: {
                category: {
                  slug: filters.categorySlug,
                },
              },
            },
          }
        : {}),
      ...(filters.collectionSlug
        ? {
            collections: {
              some: {
                collection: {
                  slug: filters.collectionSlug,
                },
              },
            },
          }
        : {}),
      ...(filters.onlyFeatured
        ? {
            priceOverrides: {
              some: {
                tenantId,
                featured: true,
                hidden: false,
              },
            },
          }
        : {}),
    },
    include: catalogProductInclude(tenantId),
    take: filters.take,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function getCatalogProductById(tenantId: string, productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      tenantId,
      deletedAt: null,
    },
    include: catalogProductInclude(tenantId),
  });
}

export async function getCatalogProductBySku(tenantId: string, sku: string) {
  return prisma.product.findFirst({
    where: {
      tenantId,
      sku,
      deletedAt: null,
    },
    include: catalogProductInclude(tenantId),
  });
}

export async function listCategoriesByTenant(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId },
    include: {
      parent: true,
      children: true,
    },
    orderBy: [{ name: "asc" }],
  });
}

export async function listCollectionsByTenant(tenantId: string) {
  return prisma.productCollection.findMany({
    where: { tenantId },
    include: {
      items: {
        include: {
          product: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function listProductReviewsByTenant(tenantId: string, productId: string) {
  return prisma.productReview.findMany({
    where: {
      tenantId,
      productId,
      status: ReviewStatus.PUBLISHED,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

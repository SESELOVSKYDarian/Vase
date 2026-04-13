import { prisma } from "@/lib/db/prisma";
import { catalogProductInclude } from "@/server/queries/business/catalog";

export async function getCheckoutProductsSnapshot(tenantId: string, productIds: string[]) {
  if (!productIds.length) {
    return [];
  }

  return prisma.product.findMany({
    where: {
      tenantId,
      id: {
        in: productIds,
      },
      deletedAt: null,
      isVisibleWeb: true,
      isActiveSource: true,
    },
    include: catalogProductInclude(tenantId),
  });
}

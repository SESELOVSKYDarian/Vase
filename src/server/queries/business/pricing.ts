import { PriceListType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function getTenantPriceLists(tenantId: string) {
  return prisma.priceList.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function getAssignedPriceListForUser(tenantId: string, userId: string) {
  return prisma.userPriceList.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    include: {
      priceList: true,
    },
  });
}

export async function getAutomaticPriceListForSegment(
  tenantId: string,
  type: PriceListType.RETAIL | PriceListType.WHOLESALE,
) {
  return prisma.priceList.findFirst({
    where: {
      tenantId,
      type,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getProductPriceOverride(tenantId: string, productId: string) {
  return prisma.productPriceOverride.findUnique({
    where: {
      tenantId_productId: {
        tenantId,
        productId,
      },
    },
  });
}

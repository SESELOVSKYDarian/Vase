import { OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function listTenantOffers(tenantId: string, onlyActive = false) {
  return prisma.tenantOffer.findMany({
    where: {
      tenantId,
      ...(onlyActive ? { status: OfferStatus.ACTIVE } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

import { prisma } from "@/lib/db/prisma";

export async function listShippingBranchesByTenant(tenantId: string) {
  return prisma.shippingBranch.findMany({
    where: {
      tenantId,
      enabled: true,
    },
    orderBy: [{ name: "asc" }],
  });
}

export async function listShippingZonesByTenant(tenantId: string) {
  return prisma.shippingZone.findMany({
    where: {
      tenantId,
      enabled: true,
    },
    include: {
      branch: true,
    },
    orderBy: [{ name: "asc" }],
  });
}

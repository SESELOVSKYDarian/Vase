import { prisma } from "@/lib/db/prisma";

export async function getTenantMembership(userId: string, tenantSlug?: string) {
  if (tenantSlug) {
    return prisma.membership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        tenant: { slug: tenantSlug },
      },
      include: {
        tenant: true,
      },
    });
  }

  return prisma.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      tenant: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

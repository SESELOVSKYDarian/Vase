import { prisma } from "@/lib/db/prisma";

export async function syncStorefrontPageLifecycle(tenantId: string) {
  const now = new Date();

  await prisma.storefrontPage.updateMany({
    where: {
      tenantId,
      isTemporary: true,
      expiresAt: {
        lt: now,
      },
      graceEndsAt: {
        gte: now,
      },
      status: {
        not: "PENDING_REMOVAL",
      },
    },
    data: {
      status: "PENDING_REMOVAL",
    },
  });

  await prisma.storefrontPage.deleteMany({
    where: {
      tenantId,
      isTemporary: true,
      graceEndsAt: {
        lt: now,
      },
    },
  });
}

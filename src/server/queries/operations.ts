import { prisma } from "@/lib/db/prisma";

export async function getOperationalMetrics() {
  const [
    users,
    tenants,
    supportTicketsOpen,
    temporaryPagesAtRisk,
    integrationCredentialsActive,
    auditEventsLast24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tenant.count(),
    prisma.supportTicket.count({
      where: {
        status: {
          in: ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"],
        },
      },
    }),
    prisma.storefrontPage.count({
      where: {
        isTemporary: true,
        status: {
          in: ["EXPIRED", "PENDING_REMOVAL"],
        },
      },
    }),
    prisma.integrationApiCredential.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    users,
    tenants,
    supportTicketsOpen,
    temporaryPagesAtRisk,
    integrationCredentialsActive,
    auditEventsLast24h,
  };
}

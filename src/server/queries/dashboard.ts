import { prisma } from "@/lib/db/prisma";
import { deriveStorefrontLifecycle } from "@/lib/business/lifecycle";
import { getEffectivePlan, getPlanLimits } from "@/lib/business/plans";
import { syncStorefrontPageLifecycle } from "@/server/services/business-lifecycle";

export async function getPlatformAdminOverview() {
  const [users, tenants, auditEvents] = await Promise.all([
    prisma.user.count(),
    prisma.tenant.count(),
    prisma.auditLog.count(),
  ]);

  return { users, tenants, auditEvents };
}

export async function getTenantOverview(tenantId: string) {
  const [members, projects, flags] = await Promise.all([
    prisma.membership.count({ where: { tenantId } }),
    prisma.project.count({ where: { tenantId } }),
    prisma.featureFlag.count({ where: { tenantId } }),
  ]);

  return { members, projects, flags };
}

export async function getBusinessOwnerDashboard(tenantId: string) {
  await syncStorefrontPageLifecycle(tenantId);

  const [
    members,
    flags,
    subscription,
    storefrontPages,
    customPageRequests,
    domainConnections,
    featureFlagRows,
  ] = await Promise.all([
    prisma.membership.count({ where: { tenantId } }),
    prisma.featureFlag.count({ where: { tenantId } }),
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
    }),
    prisma.storefrontPage.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        domainConnections: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.customPageRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        quote: {
          include: {
            lineItems: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
    prisma.domainConnection.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.featureFlag.findMany({
      where: { tenantId },
      orderBy: { key: "asc" },
    }),
  ]);

  const effectivePlan = getEffectivePlan(subscription);
  const limits = getPlanLimits(effectivePlan);
  const temporaryPages = storefrontPages.filter((page) => page.isTemporary);
  const activePages = storefrontPages.filter((page) => page.status !== "ARCHIVED");
  const connectedDomains = domainConnections.filter((domain) => domain.status === "CONNECTED");
  const pendingDomains = domainConnections.filter(
    (domain) => domain.status === "PENDING_PAYMENT" || domain.status === "PENDING_VERIFICATION",
  );

  return {
    summary: {
      members,
      flags,
      totalPages: storefrontPages.length,
      activePages: activePages.length,
      temporaryPages: temporaryPages.length,
      connectedDomains: connectedDomains.length,
      customRequests: customPageRequests.length,
    },
    plan: {
      ...effectivePlan,
      limits,
    },
    storefrontPages: storefrontPages.map((page) => ({
      ...page,
      lifecycle: deriveStorefrontLifecycle(page),
    })),
    domainConnections,
    pendingDomains,
    customPageRequests,
    featureFlags: featureFlagRows,
  };
}

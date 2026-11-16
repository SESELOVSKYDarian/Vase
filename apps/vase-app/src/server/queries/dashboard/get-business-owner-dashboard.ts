// Parte de dashboard.ts: getPlatformAdminOverview, getTenantOverview, getBusinessOwnerDashboard, getDayRange, formatStatusLabel, asEventTone y más.
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
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

export function getDayRange(offsetDays = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offsetDays);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export function formatStatusLabel(input: string) {
  return input
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function asEventTone(tone: "success" | "warning" | "danger") {
  return tone;
}

export function buildOperationalScore(input: {
  businessActive: boolean;
  labsActive: boolean;
  activePages: number;
  connectedDomains: number;
  connectedChannels: number;
  knowledgeItems: number;
}) {
  const checks = [];

  if (input.businessActive) {
    checks.push(input.activePages > 0);
    checks.push(input.connectedDomains > 0);
  }

  if (input.labsActive) {
    checks.push(input.knowledgeItems > 0);
    checks.push(input.connectedChannels > 0);
  }

  if (checks.length === 0) {
    return 0;
  }

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getDaysUntil(target: Date, now = new Date()) {
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function isSchemaMismatchError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

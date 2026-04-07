import { prisma } from "@/lib/db/prisma";
import {
  createInitialBuilderDocument,
  getBuilderCapabilities,
  normalizeBuilderDocument,
  type BuilderDocument,
} from "@/lib/business/builder";
import { getEffectivePlan } from "@/lib/business/plans";

export async function getStorefrontBuilderData(tenantId: string, pageId: string) {
  const [subscription, featureFlags, page] = await Promise.all([
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
    }),
    prisma.featureFlag.findMany({
      where: { tenantId },
      orderBy: { key: "asc" },
    }),
    prisma.storefrontPage.findFirst({
      where: {
        id: pageId,
        tenantId,
      },
      include: {
        domainConnections: {
          orderBy: { createdAt: "desc" },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 6,
        },
        customPageRequests: {
          orderBy: { createdAt: "desc" },
          take: 6,
        },
      },
    }),
  ]);

  if (!page) {
    return null;
  }

  const effectivePlan = getEffectivePlan(subscription);
  const capabilities = getBuilderCapabilities({
    isTemporary: page.isTemporary,
    plan: effectivePlan.plan,
  });
  const rawDocument = (page.builderDocument as BuilderDocument | null) ??
    createInitialBuilderDocument(page.templateKey);
  const document = normalizeBuilderDocument(rawDocument, capabilities);

  return {
    page,
    plan: effectivePlan,
    capabilities,
    featureFlags,
    document,
  };
}

export async function getPlatformCustomizationReviewQueue() {
  const [requests, pendingCount] = await Promise.all([
    prisma.customPageRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 12,
      include: {
        tenant: {
          select: {
            name: true,
            accountName: true,
          },
        },
        storefrontPage: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.customPageRequest.count({
      where: {
        status: {
          in: ["SUBMITTED", "REVIEWING", "QUOTED"],
        },
      },
    }),
  ]);

  return {
    pendingCount,
    requests,
  };
}

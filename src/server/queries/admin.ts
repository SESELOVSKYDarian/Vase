import { prisma } from "@/lib/db/prisma";
import { deriveStorefrontLifecycle } from "@/lib/business/lifecycle";

export type AdminConsoleFilters = {
  q?: string;
  product?: "ALL" | "BUSINESS" | "LABS" | "BOTH";
  tenantStatus?: "ALL" | "ACTIVE" | "TRIAL" | "SUSPENDED";
  billingStatus?: "ALL" | "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  supportStatus?:
    | "ALL"
    | "QUEUED"
    | "ASSIGNED"
    | "WAITING_CUSTOMER"
    | "WAITING_INTERNAL"
    | "RESOLVED"
    | "RETURNED_TO_AI"
    | "CLOSED";
};

function buildTenantSearch(filters: AdminConsoleFilters) {
  const query = filters.q?.trim();

  return {
    ...(filters.product && filters.product !== "ALL"
      ? { onboardingProduct: filters.product }
      : {}),
    ...(filters.tenantStatus && filters.tenantStatus !== "ALL"
      ? { status: filters.tenantStatus }
      : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
            { accountName: { contains: query } },
            { billingEmail: { contains: query } },
          ],
        }
      : {}),
  };
}

export async function getPlatformAdminConsole(filters: AdminConsoleFilters) {
  const tenantWhere = buildTenantSearch(filters);
  const query = filters.q?.trim();

  const [
    users,
    tenants,
    temporaryPages,
    customRequests,
    auditLogs,
    supportTemplates,
    supportTickets,
    activeFlags,
    activeCredentials,
    activeWebhooks,
    totalUsers,
    supportUsers,
    totalTenants,
    paidTenants,
    temporaryPageCount,
    tempPagesAtRisk,
    queuedCustomRequests,
    activeSupportTickets,
    premiumFlagsEnabled,
    platformUpdates,
    adminNotifications,
    wikiDocuments,
  ] = await Promise.all([
    prisma.user.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        adminAccessPolicy: true,
        memberships: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                accountName: true,
              },
            },
          },
          take: 3,
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.tenant.findMany({
      where: {
        ...tenantWhere,
        ...(filters.billingStatus && filters.billingStatus !== "ALL"
          ? {
              subscription: {
                is: {
                  billingStatus: filters.billingStatus,
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        subscription: true,
        featureFlags: {
          orderBy: { key: "asc" },
        },
        _count: {
          select: {
            storefrontPages: true,
            customPageRequests: true,
            aiConversations: true,
            supportTickets: true,
          },
        },
      },
    }),
    prisma.storefrontPage.findMany({
      where: {
        isTemporary: true,
        tenant: tenantWhere,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            accountName: true,
          },
        },
      },
    }),
    prisma.customPageRequest.findMany({
      where: {
        tenant: tenantWhere,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            accountName: true,
          },
        },
        storefrontPage: {
          select: {
            id: true,
            name: true,
          },
        },
        quote: {
          include: {
            lineItems: {
              orderBy: { sortOrder: "asc" },
            },
            revisions: {
              orderBy: { createdAt: "desc" },
              take: 3,
              include: {
                changedByUser: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: query
        ? {
            OR: [
              { action: { contains: query } },
              { targetType: { contains: query } },
              { tenant: { name: { contains: query } } },
              { actorUser: { email: { contains: query } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        tenant: {
          select: {
            name: true,
            accountName: true,
          },
        },
        actorUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.supportReplyTemplate.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query } },
              { category: { contains: query } },
              { body: { contains: query } },
            ],
          }
        : undefined,
      orderBy: [{ tenantId: "asc" }, { updatedAt: "desc" }],
      take: 20,
      include: {
        tenant: {
          select: {
            accountName: true,
          },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.supportTicket.findMany({
      where: {
        ...(filters.supportStatus && filters.supportStatus !== "ALL"
          ? { status: filters.supportStatus }
          : {}),
        ...(query
          ? {
              OR: [
                { subject: { contains: query } },
                { customerName: { contains: query } },
                { customerContact: { contains: query } },
                { tenant: { accountName: { contains: query } } },
              ],
            }
          : {}),
      },
      orderBy: [{ priority: "desc" }, { queueEnteredAt: "asc" }],
      take: 20,
      include: {
        tenant: {
          select: {
            name: true,
            accountName: true,
          },
        },
        assignedToUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.featureFlag.findMany({
      where: {
        enabled: true,
        OR: [{ key: { contains: "premium" } }, { key: { contains: "labs_" } }],
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        tenant: {
          select: {
            accountName: true,
          },
        },
      },
    }),
    prisma.integrationApiCredential.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        tenant: {
          select: {
            accountName: true,
          },
        },
      },
    }),
    prisma.integrationWebhookEndpoint.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        tenant: {
          select: {
            accountName: true,
          },
        },
      },
    }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        platformRole: "SUPPORT",
      },
    }),
    prisma.tenant.count(),
    prisma.tenantSubscription.count({
      where: {
        billingStatus: "ACTIVE",
      },
    }),
    prisma.storefrontPage.count({
      where: { isTemporary: true },
    }),
    prisma.storefrontPage.count({
      where: {
        isTemporary: true,
        OR: [{ status: "EXPIRED" }, { status: "PENDING_REMOVAL" }],
      },
    }),
    prisma.customPageRequest.count({
      where: {
        status: {
          in: ["SUBMITTED", "REVIEWING", "QUOTED"],
        },
      },
    }),
    prisma.supportTicket.count({
      where: {
        status: {
          in: ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"],
        },
      },
    }),
    prisma.featureFlag.count({
      where: {
        enabled: true,
        key: {
          contains: "premium",
        },
      },
    }),
    prisma.platformUpdate.findMany({
      orderBy: { publishedAt: "desc" },
      take: 10,
    }),
    prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.wikiDocument.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          take: 3,
        },
      },
    }),
  ]);

  return {
    filters,
    metrics: {
      totalUsers,
      supportUsers,
      totalTenants,
      paidTenants,
      temporaryPageCount,
      tempPagesAtRisk,
      queuedCustomRequests,
      activeSupportTickets,
      premiumFlagsEnabled,
      activeCredentials: activeCredentials.filter((row) => row.status === "ACTIVE").length,
      activeWebhooks: activeWebhooks.filter((row) => row.status === "ACTIVE").length,
    },
    users,
    tenants,
    temporaryPages: temporaryPages.map((page) => ({
      ...page,
      lifecycle: deriveStorefrontLifecycle(page),
    })),
    customRequests,
    auditLogs,
    supportTemplates,
    supportTickets,
    featureFlags: activeFlags,
    integrationCredentials: activeCredentials,
    integrationWebhooks: activeWebhooks,
    platformUpdates,
    adminNotifications,
    wikiDocuments,
  };
}

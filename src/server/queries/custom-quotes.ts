import { prisma } from "@/lib/db/prisma";

export async function getAdminCustomizationQuoteWorkspace() {
  const [requests, recentRevisions] = await Promise.all([
    prisma.customPageRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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
            slug: true,
          },
        },
        quote: {
          include: {
            lineItems: {
              orderBy: { sortOrder: "asc" },
            },
            revisions: {
              orderBy: { createdAt: "desc" },
              include: {
                changedByUser: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            createdByUser: {
              select: {
                name: true,
                email: true,
              },
            },
            updatedByUser: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      take: 50,
    }),
    prisma.customQuoteRevision.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        quote: {
          include: {
            customPageRequest: {
              include: {
                tenant: {
                  select: {
                    accountName: true,
                  },
                },
              },
            },
          },
        },
        changedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    requests,
    recentRevisions,
    metrics: {
      totalRequests: requests.length,
      withDraft: requests.filter((request) => request.quote?.status === "DRAFT").length,
      pendingClient: requests.filter((request) => request.quote?.status === "PENDING_CLIENT").length,
      accepted: requests.filter((request) => request.quote?.status === "ACCEPTED").length,
      withoutQuote: requests.filter((request) => !request.quote).length,
    },
  };
}

export async function getTenantCustomizationQuoteWorkspace(tenantId: string) {
  const requests = await prisma.customPageRequest.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      storefrontPage: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      quote: {
        include: {
          lineItems: {
            orderBy: { sortOrder: "asc" },
          },
          revisions: {
            orderBy: { createdAt: "desc" },
            take: 5,
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
  });

  return {
    requests,
    metrics: {
      totalRequests: requests.length,
      pendingReview: requests.filter((request) => request.status === "SUBMITTED" || request.status === "REVIEWING").length,
      pendingClient: requests.filter((request) => request.quote?.status === "PENDING_CLIENT").length,
      accepted: requests.filter((request) => request.quote?.status === "ACCEPTED").length,
    },
  };
}

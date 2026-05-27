import { prisma } from "@/lib/db/prisma";
import {
  createInitialBuilderDocument,
  getBuilderCapabilities,
  normalizeBuilderDocument,
  type BuilderDocument,
} from "@/lib/business/builder";
import { getEffectivePlan } from "@/lib/business/plans";

export async function getStorefrontByHostname(hostname: string) {
  const baseDomain = process.env.NODE_ENV === "production" ? "vase.ar" : "localhost:3000";

  const connection = await prisma.domainConnection.findFirst({
    where: { hostname },
    include: {
      storefrontPage: {
        include: {
          tenant: true,
          versions: {
            where: { kind: "PUBLISHED" },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (connection?.storefrontPage) {
    return decorateStorefrontData(connection.storefrontPage);
  }

  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.replace(`.${baseDomain}`, "");

    if (slug && slug !== "www") {
      const pages = await prisma.storefrontPage.findMany({
        where: { slug, status: { in: ["ACTIVE", "TEMPORARY"] } },
        include: {
          tenant: true,
          versions: {
            where: { kind: "PUBLISHED" },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
        orderBy: [
          { publishedAt: "desc" },
          { updatedAt: "desc" },
        ],
      });

      if (pages.length > 0) {
        return decorateStorefrontData(pages[0]);
      }
    }
  }

  return null;
}

async function decorateStorefrontData(page: any) {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId: page.tenantId },
  });

  const effectivePlan = getEffectivePlan(subscription);
  const capabilities = getBuilderCapabilities({
    isTemporary: page.isTemporary,
    plan: effectivePlan.plan,
  });

  const rawDocument = (page.versions[0]?.snapshot as BuilderDocument | null) ??
    (page.builderDocument as BuilderDocument | null) ??
    createInitialBuilderDocument(page.templateKey);
  const document = normalizeBuilderDocument(rawDocument, capabilities);

  return {
    page,
    tenant: page.tenant,
    plan: effectivePlan,
    capabilities,
    document,
  };
}

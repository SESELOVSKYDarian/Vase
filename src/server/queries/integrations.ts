import type { IntegrationScope } from "@/config/integrations";
import {
  integrationApiExamples,
  integrationEndpointCatalog,
  webhookEventCatalog,
} from "@/config/integrations";
import { prisma } from "@/lib/db/prisma";

export async function getOwnerIntegrationDashboard(tenantId: string) {
  const [credentials, usageLogs, webhooks] = await Promise.all([
    prisma.integrationApiCredential.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.integrationUsageLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.integrationWebhookEndpoint.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    credentials,
    usageLogs,
    webhooks,
    endpointCatalog: integrationEndpointCatalog,
    webhookEventCatalog,
  };
}

export function getIntegrationResourcePayload(resource: string, tenantSlug: string) {
  const fallbackMeta = {
    tenantSlug,
    generatedAt: new Date().toISOString(),
  };

  switch (resource) {
    case "products":
      return { ...integrationApiExamples.products, meta: fallbackMeta };
    case "stock":
      return { ...integrationApiExamples.stock, meta: fallbackMeta };
    case "prices":
      return { ...integrationApiExamples.prices, meta: fallbackMeta };
    case "categories":
      return { ...integrationApiExamples.categories, meta: fallbackMeta };
    case "orders":
      return { ...integrationApiExamples.orders, meta: fallbackMeta };
    case "clients":
      return { ...integrationApiExamples.clients, meta: fallbackMeta };
    default:
      return null;
  }
}

export function summarizeScopes(scopes: unknown): IntegrationScope[] {
  return Array.isArray(scopes) ? (scopes as IntegrationScope[]) : [];
}

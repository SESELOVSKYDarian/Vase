import type { IntegrationScope } from "@/config/integrations";
import {
  integrationApiExamples,
} from "@/config/integrations";
import { prisma } from "@/lib/db/prisma";

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

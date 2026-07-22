import { createBusinessCatalogSnapshotImporter } from "./business-catalog-snapshot";
import { createExternalCatalogBackfillCoordinator } from "./catalog-backfill";
import { labsCatalogService, prismaLabsCatalogRepository } from "./catalog-repository";
import { labsPrisma } from "./db";

export const ensureExternalCatalogBackfill = createExternalCatalogBackfillCoordinator({
  listProducts: (globalTenantId) => labsCatalogService.list(globalTenantId),
  latestSync: (globalTenantId) => prismaLabsCatalogRepository.latestEventOccurredAt(globalTenantId),
  hasExternalSource: async (assistantId) => Boolean(await labsPrisma.knowledgeItem.findFirst({
    where: { assistantId, sourceType: "EXTERNAL_MANAGEMENT", status: "READY" },
    select: { id: true },
  })),
  importSnapshot: createBusinessCatalogSnapshotImporter({
    fetchUpstream: fetch,
    sync: (batch) => labsCatalogService.sync(batch),
    appInternalUrl: process.env.APP_INTERNAL_URL,
    serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
  }),
});

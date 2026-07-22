import { labsPrisma } from "./db";
import type { CatalogProduct } from "../generated/prisma";
import { createLabsCatalogService, type CatalogEditorialInput, type LabsCatalogOperations, type LabsCatalogRecord, type LabsCatalogRepository } from "./catalog-service";

type CatalogDbClient = Pick<typeof labsPrisma, "catalogProduct" | "catalogSyncEvent">;

function mapRecord(record: CatalogProduct): LabsCatalogRecord {
  return {
    globalTenantId: record.globalTenantId,
    externalProductId: record.externalProductId,
    sku: record.sku ?? null,
    name: record.name,
    description: record.description ?? null,
    price: record.price === null || record.price === undefined ? null : Number(record.price),
    stock: record.stock,
    imageUrl: record.imageUrl ?? null,
    categories: Array.isArray(record.categories) ? record.categories.filter((item: unknown): item is string => typeof item === "string") : [],
    active: record.active,
    sourceUpdatedAt: record.sourceUpdatedAt.toISOString(),
    offeredByChatbot: record.offeredByChatbot,
    aiAlias: record.aiAlias ?? null,
    aiDescription: record.aiDescription ?? null,
    aiInstructions: record.aiInstructions ?? null,
  };
}

function createCatalogOperations(db: CatalogDbClient): LabsCatalogOperations {
  return {
    async hasEvent(eventId) {
      return Boolean(await db.catalogSyncEvent.findUnique({ where: { eventId }, select: { id: true } }));
    },
    async latestEventOccurredAt(globalTenantId) {
      const latest = await db.catalogSyncEvent.findFirst({
        where: { globalTenantId },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      });
      return latest?.occurredAt.toISOString() ?? null;
    },
    async recordEvent(eventId, metadata) {
      await db.catalogSyncEvent.create({
        data: { eventId, globalTenantId: metadata.globalTenantId, productCount: metadata.productCount, occurredAt: new Date(metadata.occurredAt) },
      });
    },
    async upsertSource(input) {
      const sourceUpdatedAt = new Date(input.sourceUpdatedAt);
      const existing = await db.catalogProduct.findUnique({
        where: { globalTenantId_externalProductId: { globalTenantId: input.globalTenantId, externalProductId: input.externalProductId } },
      });
      if (existing && existing.sourceUpdatedAt.getTime() > sourceUpdatedAt.getTime()) return mapRecord(existing);
      const source = {
        sku: input.sku,
        name: input.name,
        description: input.description,
        price: input.price,
        stock: input.stock,
        imageUrl: input.imageUrl,
        categories: input.categories,
        active: input.active,
        sourceUpdatedAt,
      };
      const record = await db.catalogProduct.upsert({
        where: { globalTenantId_externalProductId: { globalTenantId: input.globalTenantId, externalProductId: input.externalProductId } },
        create: { ...input, ...source, offeredByChatbot: input.active && input.stock > 0 },
        update: source,
      });
      return mapRecord(record);
    },
    async deactivateMissing(globalTenantId, externalProductIds) {
      const result = await db.catalogProduct.updateMany({
        where: {
          globalTenantId,
          active: true,
          ...(externalProductIds.length > 0
            ? { externalProductId: { notIn: externalProductIds } }
            : {}),
        },
        data: { active: false },
      });
      return result.count;
    },
    async updateEditorial(globalTenantId: string, externalProductId: string, input: CatalogEditorialInput) {
      const record = await db.catalogProduct.update({
        where: { globalTenantId_externalProductId: { globalTenantId, externalProductId } },
        data: input,
      });
      return mapRecord(record);
    },
    async list(globalTenantId) {
      const records = await db.catalogProduct.findMany({ where: { globalTenantId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
      return records.map(mapRecord);
    },
  };
}

const catalogOperations = createCatalogOperations(labsPrisma);
export const catalogTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

export const prismaLabsCatalogRepository: LabsCatalogRepository = {
  ...catalogOperations,
  async withTenantLock(globalTenantId, operation) {
    return labsPrisma.$transaction(async (transaction) => {
      await transaction.$queryRawUnsafe(
        "select pg_advisory_xact_lock(hashtext($1))",
        globalTenantId,
      );
      return operation(createCatalogOperations(transaction));
    }, catalogTransactionOptions);
  },
};

export const labsCatalogService = createLabsCatalogService(prismaLabsCatalogRepository);

import { labsCatalogSyncSchema, type LabsCatalogSync } from "@vase/contracts";

export interface LabsCatalogRecord {
  globalTenantId: string;
  externalProductId: string;
  sku: string | null;
  name: string;
  description: string | null;
  price: number | null;
  stock: number;
  imageUrl: string | null;
  categories: string[];
  active: boolean;
  sourceUpdatedAt: string;
  offeredByChatbot: boolean;
  aiAlias: string | null;
  aiDescription: string | null;
  aiInstructions: string | null;
}

export type CatalogEditorialInput = Pick<LabsCatalogRecord,
  "offeredByChatbot" | "aiAlias" | "aiDescription" | "aiInstructions"
>;

export interface LabsCatalogOperations {
  hasEvent(eventId: string): Promise<boolean>;
  latestEventOccurredAt(globalTenantId: string): Promise<string | null>;
  recordEvent(eventId: string, metadata: { globalTenantId: string; productCount: number; occurredAt: string }): Promise<void>;
  upsertSource(input: Omit<LabsCatalogRecord, "offeredByChatbot" | "aiAlias" | "aiDescription" | "aiInstructions">): Promise<LabsCatalogRecord>;
  deactivateMissing(globalTenantId: string, externalProductIds: string[]): Promise<number>;
  updateEditorial(globalTenantId: string, externalProductId: string, input: CatalogEditorialInput): Promise<LabsCatalogRecord>;
  list(globalTenantId: string): Promise<LabsCatalogRecord[]>;
}

export interface LabsCatalogRepository extends LabsCatalogOperations {
  withTenantLock<TResult>(
    globalTenantId: string,
    operation: (repository: LabsCatalogOperations) => Promise<TResult>,
  ): Promise<TResult>;
}

async function syncCatalogBatch(repository: LabsCatalogOperations, batch: LabsCatalogSync) {
  if (await repository.hasEvent(batch.eventId)) return { processed: false, count: 0 };
  const latestOccurredAt = await repository.latestEventOccurredAt(batch.globalTenantId);
  if (latestOccurredAt && latestOccurredAt >= batch.occurredAt) {
    await repository.recordEvent(batch.eventId, {
      globalTenantId: batch.globalTenantId,
      productCount: batch.products.length,
      occurredAt: batch.occurredAt,
    });
    return { processed: false, count: 0 };
  }

  for (const product of batch.products) {
    await repository.upsertSource({ ...product, globalTenantId: batch.globalTenantId });
  }
  await repository.deactivateMissing(
    batch.globalTenantId,
    batch.products.map((product) => product.externalProductId),
  );
  await repository.recordEvent(batch.eventId, {
    globalTenantId: batch.globalTenantId,
    productCount: batch.products.length,
    occurredAt: batch.occurredAt,
  });
  return { processed: true, count: batch.products.length };
}

export function createLabsCatalogService(repository: LabsCatalogRepository) {
  return {
    async sync(raw: LabsCatalogSync) {
      const batch = labsCatalogSyncSchema.parse(raw);
      return repository.withTenantLock(
        batch.globalTenantId,
        (lockedRepository) => syncCatalogBatch(lockedRepository, batch),
      );
    },
    list(globalTenantId: string) {
      return repository.list(globalTenantId);
    },
    updateEditorial(globalTenantId: string, externalProductId: string, input: CatalogEditorialInput) {
      return repository.updateEditorial(globalTenantId, externalProductId, input);
    },
    async buildAiContext(globalTenantId: string) {
      const products = await repository.list(globalTenantId);
      return products
        .filter((product) => product.active && product.stock > 0 && product.offeredByChatbot)
        .map((product) => [
          `# ${product.aiAlias || product.name}`,
          product.aiDescription || product.description || "",
          `SKU: ${product.sku || "N/A"} | Precio: ${product.price ?? "Consultar"} | Stock: ${product.stock}`,
          product.aiInstructions || "",
        ].filter(Boolean).join("\n"))
        .join("\n\n");
    },
  };
}

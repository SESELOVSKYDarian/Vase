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

export interface LabsCatalogRepository {
  hasEvent(eventId: string): Promise<boolean>;
  recordEvent(eventId: string, metadata: { globalTenantId: string; productCount: number; occurredAt: string }): Promise<void>;
  upsertSource(input: Omit<LabsCatalogRecord, "offeredByChatbot" | "aiAlias" | "aiDescription" | "aiInstructions">): Promise<LabsCatalogRecord>;
  updateEditorial(globalTenantId: string, externalProductId: string, input: CatalogEditorialInput): Promise<LabsCatalogRecord>;
  list(globalTenantId: string): Promise<LabsCatalogRecord[]>;
}

export function createLabsCatalogService(repository: LabsCatalogRepository) {
  return {
    async sync(raw: LabsCatalogSync) {
      const batch = labsCatalogSyncSchema.parse(raw);
      if (await repository.hasEvent(batch.eventId)) return { processed: false, count: 0 };

      for (const product of batch.products) {
        await repository.upsertSource({ ...product, globalTenantId: batch.globalTenantId });
      }
      await repository.recordEvent(batch.eventId, {
        globalTenantId: batch.globalTenantId,
        productCount: batch.products.length,
        occurredAt: batch.occurredAt,
      });
      return { processed: true, count: batch.products.length };
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

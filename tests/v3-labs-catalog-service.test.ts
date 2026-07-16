import { describe, expect, it } from "vitest";
import {
  createLabsCatalogService,
  type LabsCatalogRecord,
  type LabsCatalogRepository,
} from "../apps/vase-labs/app/lib/catalog-service";

function memoryRepository(): LabsCatalogRepository {
  const records = new Map<string, LabsCatalogRecord>();
  const events = new Set<string>();
  return {
    async hasEvent(eventId) { return events.has(eventId); },
    async recordEvent(eventId) { events.add(eventId); },
    async upsertSource(input) {
      const key = `${input.globalTenantId}:${input.externalProductId}`;
      const current = records.get(key);
      if (current && current.sourceUpdatedAt >= input.sourceUpdatedAt) return current;
      const next: LabsCatalogRecord = {
        ...input,
        offeredByChatbot: current?.offeredByChatbot ?? (input.active && input.stock > 0),
        aiAlias: current?.aiAlias ?? null,
        aiDescription: current?.aiDescription ?? null,
        aiInstructions: current?.aiInstructions ?? null,
      };
      records.set(key, next);
      return next;
    },
    async updateEditorial(globalTenantId, externalProductId, editorial) {
      const key = `${globalTenantId}:${externalProductId}`;
      const current = records.get(key);
      if (!current) throw new Error("CATALOG_PRODUCT_NOT_FOUND");
      const next = { ...current, ...editorial };
      records.set(key, next);
      return next;
    },
    async list(globalTenantId) {
      return [...records.values()].filter((item) => item.globalTenantId === globalTenantId);
    },
  };
}

const batch = {
  eventId: "evt_1",
  globalTenantId: "tenant_1",
  occurredAt: "2026-07-16T12:00:00.000Z",
  products: [
    { externalProductId: "p1", sku: "A", name: "Con stock", description: null, price: 100, stock: 4, imageUrl: null, categories: [], active: true, sourceUpdatedAt: "2026-07-16T11:00:00.000Z" },
    { externalProductId: "p2", sku: "B", name: "Agotado", description: null, price: 200, stock: 0, imageUrl: null, categories: [], active: true, sourceUpdatedAt: "2026-07-16T11:00:00.000Z" },
  ],
} as const;

describe("Labs catalog service", () => {
  it("syncs idempotently and selects only active products with stock by default", async () => {
    const service = createLabsCatalogService(memoryRepository());
    expect(await service.sync(batch)).toMatchObject({ processed: true, count: 2 });
    expect(await service.sync(batch)).toMatchObject({ processed: false, count: 0 });
    expect((await service.list("tenant_1")).map((item) => [item.externalProductId, item.offeredByChatbot])).toEqual([
      ["p1", true],
      ["p2", false],
    ]);
  });

  it("preserves editorial fields across source updates and excludes out-of-stock products from AI context", async () => {
    const service = createLabsCatalogService(memoryRepository());
    await service.sync(batch);
    await service.updateEditorial("tenant_1", "p1", {
      offeredByChatbot: true,
      aiAlias: "Producto estrella",
      aiDescription: "Descripcion comercial",
      aiInstructions: "Ofrecer primero",
    });
    await service.sync({
      ...batch,
      eventId: "evt_2",
      occurredAt: "2026-07-16T13:00:00.000Z",
      products: [{ ...batch.products[0], stock: 0, sourceUpdatedAt: "2026-07-16T13:00:00.000Z" }],
    });

    expect((await service.list("tenant_1"))[0].aiAlias).toBe("Producto estrella");
    expect(await service.buildAiContext("tenant_1")).toBe("");
  });
});

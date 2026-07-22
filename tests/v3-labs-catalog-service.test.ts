import { describe, expect, it } from "vitest";
import {
  createLabsCatalogService,
  type LabsCatalogOperations,
  type LabsCatalogRecord,
  type LabsCatalogRepository,
} from "../apps/vase-labs/app/lib/catalog-service";

function memoryRepository(): LabsCatalogRepository {
  const records = new Map<string, LabsCatalogRecord>();
  const events = new Set<string>();
  const latestEvents = new Map<string, string>();
  const operations: LabsCatalogOperations = {
    async hasEvent(eventId) { return events.has(eventId); },
    async latestEventOccurredAt(globalTenantId) { return latestEvents.get(globalTenantId) ?? null; },
    async recordEvent(eventId, metadata) {
      events.add(eventId);
      const current = latestEvents.get(metadata.globalTenantId);
      if (!current || current < metadata.occurredAt) latestEvents.set(metadata.globalTenantId, metadata.occurredAt);
    },
    async upsertSource(input) {
      const key = `${input.globalTenantId}:${input.externalProductId}`;
      const current = records.get(key);
      if (current && current.sourceUpdatedAt > input.sourceUpdatedAt) return current;
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
    async deactivateMissing(globalTenantId, externalProductIds) {
      let count = 0;
      for (const [key, current] of records) {
        if (current.globalTenantId !== globalTenantId || externalProductIds.includes(current.externalProductId) || !current.active) continue;
        records.set(key, { ...current, active: false });
        count += 1;
      }
      return count;
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
  const lockTails = new Map<string, Promise<void>>();
  return {
    ...operations,
    async withTenantLock(globalTenantId, operation) {
      const previous = lockTails.get(globalTenantId) ?? Promise.resolve();
      let release = () => {};
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const tail = previous.then(() => gate);
      lockTails.set(globalTenantId, tail);
      await previous;
      try {
        return await operation(operations);
      } finally {
        release();
        if (lockTails.get(globalTenantId) === tail) lockTails.delete(globalTenantId);
      }
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

  it("deactivates products missing from a full snapshot without touching another tenant", async () => {
    const service = createLabsCatalogService(memoryRepository());
    await service.sync(batch);
    await service.sync({
      ...batch,
      eventId: "tenant-2-event",
      globalTenantId: "tenant_2",
      products: [{ ...batch.products[0], externalProductId: "other-product" }],
    });

    await service.sync({
      eventId: "tenant-1-empty",
      globalTenantId: "tenant_1",
      occurredAt: "2026-07-22T15:00:00.000Z",
      products: [],
    });

    expect((await service.list("tenant_1")).every((product) => !product.active)).toBe(true);
    expect((await service.list("tenant_2"))[0]).toMatchObject({
      externalProductId: "other-product",
      active: true,
    });

    await service.sync({ ...batch, eventId: "tenant-1-restored", occurredAt: "2026-07-22T16:00:00.000Z" });
    expect((await service.list("tenant_1")).every((product) => product.active)).toBe(true);
  });

  it("ignores a delayed older snapshot without removing newer products", async () => {
    const service = createLabsCatalogService(memoryRepository());
    await service.sync({ ...batch, eventId: "newer", occurredAt: "2026-07-22T15:00:00.000Z" });

    await expect(service.sync({
      ...batch,
      eventId: "older-retry",
      occurredAt: "2026-07-22T14:00:00.000Z",
      products: [batch.products[0]],
    })).resolves.toEqual({ processed: false, count: 0 });

    expect(await service.list("tenant_1")).toEqual([
      expect.objectContaining({ externalProductId: "p1", active: true }),
      expect.objectContaining({ externalProductId: "p2", active: true }),
    ]);
  });

  it("serializes concurrent snapshots for the same tenant", async () => {
    const service = createLabsCatalogService(memoryRepository());
    const newer = { ...batch, eventId: "concurrent-newer", occurredAt: "2026-07-22T15:00:00.000Z" };
    const older = {
      ...batch,
      eventId: "concurrent-older",
      occurredAt: "2026-07-22T14:00:00.000Z",
      products: [batch.products[0]],
    };

    await Promise.all([service.sync(newer), service.sync(older)]);

    expect(await service.list("tenant_1")).toEqual([
      expect.objectContaining({ externalProductId: "p1", active: true }),
      expect.objectContaining({ externalProductId: "p2", active: true }),
    ]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createExternalCatalogBackfillCoordinator } from "../apps/vase-labs/app/lib/catalog-backfill";

function setup(options?: { products?: unknown[]; connected?: boolean; lastSync?: string | null; retryDelayMs?: number }) {
  let lastSync = options?.lastSync ?? null;
  const listProducts = vi.fn(async () => options?.products ?? []);
  const latestSync = vi.fn(async () => lastSync);
  const hasExternalSource = vi.fn(async () => options?.connected ?? true);
  const importSnapshot = vi.fn(async () => {
    lastSync = "2026-07-22T20:00:00.000Z";
    return { processed: true, count: 0 };
  });
  const ensureBackfill = createExternalCatalogBackfillCoordinator({
    listProducts,
    latestSync,
    hasExternalSource,
    importSnapshot,
  }, { retryDelayMs: options?.retryDelayMs ?? 60_000 });
  return { listProducts, latestSync, hasExternalSource, importSnapshot, ensureBackfill };
}

const identity = { globalTenantId: "tenant-1", assistantId: "assistant-1" };

describe("Labs legacy external catalog backfill", () => {
  it("imports a snapshot for an already-connected source that was never synchronized", async () => {
    const { ensureBackfill, importSnapshot } = setup();
    await expect(ensureBackfill(identity)).resolves.toEqual({ attempted: true, imported: 0 });
    expect(importSnapshot).toHaveBeenCalledWith("tenant-1");
  });

  it("uses the durable sync event to avoid repeating a successful empty import", async () => {
    const { ensureBackfill, importSnapshot } = setup();
    await ensureBackfill(identity);
    await expect(ensureBackfill(identity)).resolves.toEqual({ attempted: false, imported: 0 });
    expect(importSnapshot).toHaveBeenCalledTimes(1);
  });

  it("does not import when products or a prior sync already exist", async () => {
    const withProducts = setup({ products: [{ externalProductId: "p1" }] });
    await withProducts.ensureBackfill(identity);
    expect(withProducts.importSnapshot).not.toHaveBeenCalled();

    const withSync = setup({ lastSync: "2026-07-22T19:00:00.000Z" });
    await withSync.ensureBackfill(identity);
    expect(withSync.importSnapshot).not.toHaveBeenCalled();
  });

  it("does not import when no external-management source exists", async () => {
    const { ensureBackfill, importSnapshot } = setup({ connected: false });
    await ensureBackfill(identity);
    expect(importSnapshot).not.toHaveBeenCalled();
  });

  it("coalesces concurrent page renders into one snapshot import", async () => {
    let release = () => {};
    const pending = new Promise<{ processed: true; count: number }>((resolve) => { release = () => resolve({ processed: true, count: 3 }); });
    const deps = setup();
    deps.importSnapshot.mockImplementation(() => pending);

    const first = deps.ensureBackfill(identity);
    const second = deps.ensureBackfill(identity);
    await vi.waitFor(() => expect(deps.importSnapshot).toHaveBeenCalledTimes(1));
    release();

    await expect(Promise.all([first, second])).resolves.toEqual([
      { attempted: true, imported: 3 },
      { attempted: true, imported: 3 },
    ]);
  });

  it("backs off after a failed import instead of retrying on every render", async () => {
    const now = vi.fn(() => 1_000);
    const importSnapshot = vi.fn(async () => { throw new Error("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE"); });
    const ensureBackfill = createExternalCatalogBackfillCoordinator({
      listProducts: async () => [],
      latestSync: async () => null,
      hasExternalSource: async () => true,
      importSnapshot,
    }, { retryDelayMs: 60_000, now });

    await expect(ensureBackfill(identity)).rejects.toThrow("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    await expect(ensureBackfill(identity)).resolves.toEqual({ attempted: false, imported: 0 });
    expect(importSnapshot).toHaveBeenCalledTimes(1);
  });
});

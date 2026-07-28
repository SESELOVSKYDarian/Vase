import { describe, expect, it, vi } from "vitest";
import { createTableService } from "../apps/vase-rest/app/lib/salon/table-service";

describe("Rest floors and tables", () => {
  it("creates positioned tables and applies versioned occupancy transitions", async () => {
    const transition = vi.fn(async (input) => ({ ...input, revision: 3 }));
    const service = createTableService({
      find: async () => ({
        id: "table_1", globalTenantId: "tenant_1", branchId: "branch_1",
        status: "AVAILABLE", revision: 2, capacity: 4, mergedIntoId: null,
      }),
      create: vi.fn(async (input) => ({ id: "table_1", revision: 1, ...input })),
      transition,
      merge: vi.fn(),
      split: vi.fn(),
    });
    await service.create({
      globalTenantId: "tenant_1", branchId: "branch_1", floorId: "floor_1",
      code: "M01", name: "Mesa 1", capacity: 4, x: 120, y: 80, width: 90, height: 90,
    });
    await service.transition({
      globalTenantId: "tenant_1", branchId: "branch_1", tableId: "table_1",
      expectedRevision: 2, to: "OCCUPIED", actorId: "waiter_1",
    });
    expect(transition).toHaveBeenCalledWith(expect.objectContaining({
      from: "AVAILABLE", to: "OCCUPIED",
    }));
  });

  it("rejects cross-branch access, invalid transitions and stale revisions", async () => {
    const service = createTableService({
      find: async () => ({
        id: "table_1", globalTenantId: "tenant_1", branchId: "branch_1",
        status: "OCCUPIED", revision: 4, capacity: 4, mergedIntoId: null,
      }),
      create: vi.fn(), transition: vi.fn(), merge: vi.fn(), split: vi.fn(),
    });
    await expect(service.transition({
      globalTenantId: "tenant_1", branchId: "branch_2", tableId: "table_1",
      expectedRevision: 4, to: "AVAILABLE", actorId: "waiter_1",
    })).rejects.toThrow("REST_TABLE_NOT_FOUND");
    await expect(service.transition({
      globalTenantId: "tenant_1", branchId: "branch_1", tableId: "table_1",
      expectedRevision: 3, to: "CLEANING", actorId: "waiter_1",
    })).rejects.toThrow("REST_TABLE_REVISION_CONFLICT");
  });

  it("merges and splits only available tables", async () => {
    const merge = vi.fn(async () => ({ groupId: "merge_1" }));
    const split = vi.fn(async () => ({ ok: true }));
    const rows = new Map([
      ["a", { id: "a", globalTenantId: "t", branchId: "b", status: "AVAILABLE", revision: 1, capacity: 2, mergedIntoId: null }],
      ["b", { id: "b", globalTenantId: "t", branchId: "b", status: "AVAILABLE", revision: 1, capacity: 4, mergedIntoId: null }],
    ]);
    const service = createTableService({
      find: async (_t, _b, id) => rows.get(id) ?? null,
      create: vi.fn(), transition: vi.fn(), merge, split,
    });
    await service.merge({ globalTenantId: "t", branchId: "b", tableIds: ["a", "b"], actorId: "w" });
    expect(merge).toHaveBeenCalledWith(expect.objectContaining({ capacity: 6 }));
    await service.split({ globalTenantId: "t", branchId: "b", anchorTableId: "a", actorId: "w" });
    expect(split).toHaveBeenCalled();
  });
});

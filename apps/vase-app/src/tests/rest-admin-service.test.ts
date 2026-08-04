import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  ensureModuleCatalogSynced: vi.fn(),
  contractUpsert: vi.fn(),
  moduleUpsert: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    restPricingVersion: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/server/services/modules", () => ({ ensureModuleCatalogSynced: mocks.ensureModuleCatalogSynced }));
vi.mock("@/server/queries/modules", () => ({ getTenantModulesAccess: vi.fn() }));

import { executeRestAdminCommand } from "@/server/services/rest-admin";

describe("Rest admin contract acceptance", () => {
  const tx = {
    restPricingVersion: {
      findFirst: vi.fn(),
    },
    tenantModule: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: mocks.moduleUpsert,
    },
    tenantRestContract: {
      upsert: mocks.contractUpsert,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    tx.restPricingVersion.findFirst.mockResolvedValue({
      id: "pricing-1",
      plan: "STARTER",
      version: 3,
      currency: "ARS",
      monthlyPrice: 5000,
      branchLimit: 1,
      localEmployeeLimit: 5,
      deviceLimit: 2,
      edgeLimit: 1,
      status: "PUBLISHED",
    });
  });

  it("delegates ACCEPT_CONTRACT through exactly one transaction", async () => {
    const result = await executeRestAdminCommand({
      action: "ACCEPT_CONTRACT",
      globalTenantId: "tenant-1",
      pricingVersionId: "pricing-1",
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.contractUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: "tenant-1", pricingVersionId: "pricing-1", acceptedVersion: 3 }),
    }));
    expect(mocks.moduleUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ moduleId: "vase_rest", commercialStatus: "ACTIVE" }),
    }));
    expect(result).toMatchObject({ globalTenantId: "tenant-1", status: "ACTIVE", contractVersion: 3 });
  });

  it("rejects a missing or unpublished price without contract writes", async () => {
    tx.restPricingVersion.findFirst.mockResolvedValueOnce(null);
    await expect(executeRestAdminCommand({
      action: "ACCEPT_CONTRACT",
      globalTenantId: "tenant-1",
      pricingVersionId: "draft-1",
    })).rejects.toThrow("REST_PRICING_NOT_PUBLISHED");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.contractUpsert).not.toHaveBeenCalled();
    expect(mocks.moduleUpsert).not.toHaveBeenCalled();
  });
});

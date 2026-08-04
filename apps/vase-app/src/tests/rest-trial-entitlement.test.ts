/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  tenantFindMany: vi.fn(),
  moduleFindMany: vi.fn(),
  userAccessFindMany: vi.fn(),
  userAccessUpsert: vi.fn(),
  membershipFindFirst: vi.fn(),
  contractFindUnique: vi.fn(),
  pricingFindMany: vi.fn(),
  transaction: vi.fn(),
  ensureModuleCatalogSynced: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: { findUnique: mocks.tenantFindUnique, findMany: mocks.tenantFindMany },
    module: { findMany: mocks.moduleFindMany },
    userModuleAccess: { findMany: mocks.userAccessFindMany, upsert: mocks.userAccessUpsert },
    membership: { findFirst: mocks.membershipFindFirst },
    tenantRestContract: { findUnique: mocks.contractFindUnique },
    restPricingVersion: {
      findMany: mocks.pricingFindMany,
      aggregate: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/server/services/modules", () => ({
  ensureModuleCatalogSynced: mocks.ensureModuleCatalogSynced,
  serializePricingType: (value: string) => value,
}));

import { isRestContractEntitled } from "@/lib/rest/contract-entitlement";
import { getTenantModulesAccess } from "@/server/queries/modules";
import { createRestSessionContextService } from "@/server/services/rest-session-context";
import { executeRestAdminCommand, listRestAdminData } from "@/server/services/rest-admin";

const trialTenant = {
  id: "tenant-1",
  name: "Trial Restaurant",
  slug: "trial-restaurant",
  status: "TRIAL",
  onboardingProduct: "BUSINESS",
  featureFlags: [],
  storefrontPages: [],
  aiWorkspace: null,
  tenantModules: [{ moduleId: "vase_rest", isActive: true }],
  restContract: { status: "TRIAL" },
};

describe("Rest Trial entitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantFindUnique.mockResolvedValue(trialTenant);
    mocks.moduleFindMany.mockResolvedValue([{ id: "vase_rest", isActive: true, description: "Rest", route: null, pricing: [] }]);
    mocks.userAccessFindMany.mockResolvedValue([{ moduleId: "vase_rest", isActive: true }]);
    mocks.membershipFindFirst.mockResolvedValue({ id: "membership-1" });
    mocks.contractFindUnique.mockResolvedValue({ status: "TRIAL" });
    mocks.userAccessUpsert.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations));
    mocks.pricingFindMany.mockResolvedValue([]);
    mocks.tenantFindMany.mockResolvedValue([{
      ...trialTenant,
      restContract: {
        pricingVersionId: "pricing-1",
        plan: "STARTER",
        status: "TRIAL",
        acceptedVersion: 1,
        agreedMonthlyPrice: 5000,
        currency: "ARS",
      },
      memberships: [{
        role: "OWNER",
        user: {
          id: "owner-1",
          name: "Owner",
          email: "owner@example.com",
          moduleAccesses: [{ moduleId: "vase_rest", isActive: true }],
        },
      }],
    }]);
  });

  it("uses one predicate for ACTIVE and TRIAL only", () => {
    expect(isRestContractEntitled("ACTIVE")).toBe(true);
    expect(isRestContractEntitled("TRIAL")).toBe(true);
    expect(isRestContractEntitled("SUSPENDED")).toBe(false);
    expect(isRestContractEntitled(null)).toBe(false);
  });

  it("keeps the Rest TenantModule visible for a Trial contract", async () => {
    const access = await getTenantModulesAccess("tenant-1", "owner-1");
    expect(access?.modules.find((module) => module.id === "vase_rest")).toMatchObject({ isActive: true });
  });

  it("lists and mutates user access for a Trial Rest contract", async () => {
    const data = await listRestAdminData();
    expect(data.contractTenants[0].members[0].hasRestAccess).toBe(true);

    await expect(executeRestAdminCommand({
      action: "SET_USER_ACCESS",
      globalTenantId: "tenant-1",
      userId: "owner-1",
      isActive: true,
    })).resolves.toEqual({ globalTenantId: "tenant-1", userId: "owner-1", isActive: true });
  });

  it("resolves a Trial session context", async () => {
    const service = createRestSessionContextService({
      findMembership: async () => ({
        globalUserId: "owner-1",
        userName: "Owner",
        membershipStatus: "ACTIVE",
        tenantRole: "OWNER",
        globalTenantId: "tenant-1",
        tenantSlug: "trial-restaurant",
        tenantName: "Trial Restaurant",
        tenantStatus: "TRIAL",
        contract: {
          status: "TRIAL",
          plan: "STARTER",
          pricingVersion: 1,
          limits: { branches: 1, localEmployees: 15, devices: 5, edgeInstallations: 1 },
        },
      }),
    });

    await expect(service.resolve({ globalUserId: "owner-1" })).resolves.toMatchObject({
      entitlement: { status: "TRIAL" },
    });
  });
});

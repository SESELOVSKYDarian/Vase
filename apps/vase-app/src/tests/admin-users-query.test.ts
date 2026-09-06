import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureModuleCatalogSynced: vi.fn(),
  userFindMany: vi.fn(),
  moduleFindMany: vi.fn(),
  clientAccountFindMany: vi.fn(),
  restPricingFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findMany: mocks.userFindMany },
    module: { findMany: mocks.moduleFindMany },
    clientAccount: { findMany: mocks.clientAccountFindMany },
    restPricingVersion: { findMany: mocks.restPricingFindMany },
  },
}));
vi.mock("@/server/services/modules", () => ({
  ensureModuleCatalogSynced: mocks.ensureModuleCatalogSynced,
}));
vi.mock("@/server/queries/modules-admin", () => ({
  serializeModuleFeature: (feature: unknown) => feature,
}));
vi.mock("@/lib/admin/user-access", () => ({
  getUserAccessModuleLabel: (id: string) => id,
  inferUiRoleFromStoredRoles: vi.fn(),
}));
vi.mock("@/lib/admin/client-product-access", () => ({
  parseStoredClientProductAccess: vi.fn(() => null),
}));

import { getAdminUsersWorkspaceData } from "@/server/queries/admin-users";

describe("getAdminUsersWorkspaceData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindMany.mockResolvedValue([]);
    mocks.moduleFindMany.mockResolvedValue([]);
    mocks.clientAccountFindMany.mockResolvedValue([]);
    mocks.restPricingFindMany.mockResolvedValue([]);
  });

  it("synchronizes the platform catalog before loading the Admin editor data", async () => {
    await getAdminUsersWorkspaceData();

    expect(mocks.ensureModuleCatalogSynced).toHaveBeenCalledTimes(1);
    expect(mocks.ensureModuleCatalogSynced.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.moduleFindMany.mock.invocationCallOrder[0]);
  });
});

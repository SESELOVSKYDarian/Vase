import { describe, expect, it, vi } from "vitest";
import { provisionRestTenant } from "../apps/vase-rest/app/lib/tenant-provisioning";

const context = {
  globalTenantId: "tenant_123",
  tenantSlug: "norte",
  tenantName: "Norte",
  actor: { kind: "GLOBAL_USER" as const, id: "user_123", displayName: "Owner" },
  branchId: null,
  branchRoles: [],
  deviceId: null,
  entitlement: {
    globalTenantId: "tenant_123",
    plan: "GROWTH" as const,
    status: "ACTIVE" as const,
    limits: { branches: 3, localEmployees: 60, devices: 20, edgeInstallations: 3 },
    contractVersion: 2,
  },
};

describe("Rest tenant provisioning", () => {
  it("upserts tenant and entitlement atomically and idempotently", async () => {
    const upsertTenantWithEntitlement = vi.fn(async () => ({
      id: "rest_tenant_1",
      globalTenantId: "tenant_123",
    }));
    const repository = { upsertTenantWithEntitlement };

    await provisionRestTenant({ context, repository });
    await provisionRestTenant({ context, repository });

    expect(upsertTenantWithEntitlement).toHaveBeenNthCalledWith(1, {
      globalTenantId: "tenant_123",
      name: "Norte",
      slug: "norte",
      entitlement: context.entitlement,
    });
    expect(upsertTenantWithEntitlement).toHaveBeenCalledTimes(2);
  });

  it("rejects a mismatched entitlement tenant before persistence", async () => {
    const repository = { upsertTenantWithEntitlement: vi.fn() };
    await expect(provisionRestTenant({
      context: {
        ...context,
        entitlement: { ...context.entitlement, globalTenantId: "tenant_other" },
      },
      repository,
    })).rejects.toThrow("REST_TENANT_FORBIDDEN");
    expect(repository.upsertTenantWithEntitlement).not.toHaveBeenCalled();
  });
});

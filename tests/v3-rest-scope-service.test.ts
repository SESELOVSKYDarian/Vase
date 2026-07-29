import { describe, expect, it, vi } from "vitest";
import { createScopeService } from "../apps/vase-rest/app/lib/scopes/scope-service";

describe("Rest scoped configuration service", () => {
  it("rejects stale revisions and isolates every scope by tenant", async () => {
    const repository = {
      find: vi.fn(async () => ({
        globalTenantId: "tenant_1",
        family: "PRICING",
        scopeType: "BRANCH",
        scopeId: "branch_1",
        revision: 3,
        value: { taxIncluded: true },
      })),
      upsert: vi.fn(),
      remove: vi.fn(),
      countImpactedBranches: vi.fn(async () => 1),
    };
    const service = createScopeService(repository);
    await expect(service.set({
      globalTenantId: "tenant_1",
      family: "PRICING",
      scopeType: "BRANCH",
      scopeId: "branch_1",
      expectedRevision: 2,
      value: { taxIncluded: false },
      actorId: "owner_1",
    })).rejects.toThrow("REST_SCOPE_REVISION_CONFLICT");
    expect(repository.upsert).not.toHaveBeenCalled();

    repository.find.mockResolvedValueOnce(null);
    await expect(service.set({
      globalTenantId: "tenant_2",
      family: "PRICING",
      scopeType: "BRANCH",
      scopeId: "branch_from_tenant_1",
      expectedRevision: 0,
      value: {},
      actorId: "owner_2",
    })).rejects.toThrow("REST_SCOPE_FORBIDDEN");
  });

  it("resets an override to inherited and previews affected branches", async () => {
    const remove = vi.fn(async () => true);
    const repository = {
      find: vi.fn(async () => ({
        globalTenantId: "tenant_1",
        family: "RECIPES",
        scopeType: "BRANCH_GROUP",
        scopeId: "group_1",
        revision: 5,
        value: { book: "regional" },
      })),
      upsert: vi.fn(),
      remove,
      scopeBelongsToTenant: vi.fn(async () => true),
      countImpactedBranches: vi.fn(async () => 3),
    };
    const service = createScopeService(repository);
    await expect(service.preview({
      globalTenantId: "tenant_1",
      scopeType: "BRANCH_GROUP",
      scopeId: "group_1",
    })).resolves.toEqual({ impactedBranches: 3 });
    await service.reset({
      globalTenantId: "tenant_1",
      family: "RECIPES",
      scopeType: "BRANCH_GROUP",
      scopeId: "group_1",
      expectedRevision: 5,
      actorId: "owner_1",
    });
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({
      globalTenantId: "tenant_1",
      expectedRevision: 5,
    }));
  });
});

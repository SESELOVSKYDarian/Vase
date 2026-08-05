/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { findAuthorizedLabsMembership } from "@/server/services/labs-session-context";
import { findAuthorizedRestMembership } from "@/server/services/rest-session-context";
import { hasCompatibleUserModuleAccess } from "@/server/services/user-module-access-policy";

function expectManagedModuleGates(where: any, moduleId: string) {
  expect(where).toMatchObject({
    status: "ACTIVE",
    user: {
      OR: [
        { moduleAccesses: { none: {} } },
        { moduleAccesses: { some: { moduleId, isActive: true } } },
      ],
    },
    tenant: {
      tenantModules: {
        some: {
          moduleId,
          isActive: true,
          commercialStatus: { in: ["ACTIVE", "TRIAL"] },
        },
      },
    },
  });
}

describe("signed context production repositories", () => {
  it("builds the Labs query with membership, tenant entitlement and explicit user grant gates", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await findAuthorizedLabsMembership({ membership: { findFirst } } as any, {
      userId: "member-1",
      requestedTenantSlug: "tenant-one",
    });
    expectManagedModuleGates(findFirst.mock.calls[0][0].where, "vase_labs");
  });

  it("rejects a suspended selected Labs plan even when another Labs submodule is active", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      tenant: {
        aiWorkspace: { entitlementPlan: "PRO", plan: "PREMIUM" },
        tenantModules: [{ isActive: true, commercialStatus: "ACTIVE" }],
        tenantSubmodules: [
          { isActive: true, commercialStatus: "SUSPENDED", submodule: { key: "pro", moduleId: "vase_labs" } },
          { isActive: true, commercialStatus: "ACTIVE", submodule: { key: "growth", moduleId: "vase_labs" } },
        ],
      },
    });

    await expect(findAuthorizedLabsMembership({ membership: { findFirst } } as any, {
      userId: "member-1",
    })).resolves.toBeNull();
  });

  it("allows a migrated pro-only Labs selection instead of suspending it", async () => {
    const membership = {
      tenant: {
        aiWorkspace: { entitlementPlan: "PRO", plan: "PREMIUM" },
        tenantModules: [{ isActive: true, commercialStatus: "ACTIVE" }],
        tenantSubmodules: [
          { isActive: true, commercialStatus: "ACTIVE", submodule: { key: "pro", moduleId: "vase_labs" } },
        ],
      },
    };
    const findFirst = vi.fn().mockResolvedValue(membership);
    await expect(findAuthorizedLabsMembership({ membership: { findFirst } } as any, {
      userId: "owner-1",
    })).resolves.toBe(membership);
  });

  it("builds the Rest query with membership, tenant entitlement and explicit user grant gates", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await findAuthorizedRestMembership({ membership: { findFirst } } as any, {
      globalUserId: "member-1",
      requestedTenantSlug: "tenant-one",
    });
    expectManagedModuleGates(findFirst.mock.calls[0][0].where, "vase_rest");
  });

  it.each(["vase_labs", "vase_rest"])("applies legacy-compatible explicit user grants for %s", (moduleId) => {
    expect(hasCompatibleUserModuleAccess([], moduleId)).toBe(true);
    expect(hasCompatibleUserModuleAccess([{ moduleId: "unrelated", isActive: true }], moduleId)).toBe(false);
    expect(hasCompatibleUserModuleAccess([{ moduleId, isActive: false }], moduleId)).toBe(false);
    expect(hasCompatibleUserModuleAccess([{ moduleId, isActive: true }], moduleId)).toBe(true);
  });
});

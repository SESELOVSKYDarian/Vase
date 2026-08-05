/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { findAuthorizedLabsMembership } from "@/server/services/labs-session-context";
import { findAuthorizedRestMembership } from "@/server/services/rest-session-context";

function expectManagedModuleGates(where: any, moduleId: string) {
  expect(where).toMatchObject({
    status: "ACTIVE",
    user: {
      moduleAccesses: {
        some: { moduleId, isActive: true },
      },
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

  it("builds the Rest query with membership, tenant entitlement and explicit user grant gates", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await findAuthorizedRestMembership({ membership: { findFirst } } as any, {
      globalUserId: "member-1",
      requestedTenantSlug: "tenant-one",
    });
    expectManagedModuleGates(findFirst.mock.calls[0][0].where, "vase_rest");
  });
});

import { describe, expect, it } from "vitest";
import {
  createRestSessionContextService,
  signRestSessionContext,
  verifyRestSessionContextSignature,
} from "../apps/vase-app/src/server/services/rest-session-context";
import { GET as getSessionContext } from "../apps/vase-app/src/app/api/internal/rest/session-context/route";
import {
  GET as listRestPlans,
  POST as mutateRestPlans,
} from "../apps/vase-app/src/app/api/internal/admin/rest/plans/route";

describe("Vase Rest owner session context", () => {
  it("resolves an active membership and its accepted Rest contract", async () => {
    const service = createRestSessionContextService({
      async findMembership() {
        return {
          globalUserId: "user_123",
          userName: "Ana",
          membershipStatus: "ACTIVE",
          tenantRole: "OWNER",
          globalTenantId: "tenant_123",
          tenantSlug: "casa-norte",
          tenantName: "Casa Norte",
          tenantStatus: "ACTIVE",
          contract: {
            status: "ACTIVE",
            plan: "PRO",
            pricingVersion: 7,
            limits: { branches: 10, localEmployees: 250, devices: 75, edgeInstallations: 10 },
          },
        };
      },
    });

    const context = await service.resolve({
      globalUserId: "user_123",
      requestedTenantSlug: "casa-norte",
    });

    expect(context).toMatchObject({
      globalTenantId: "tenant_123",
      actor: { kind: "GLOBAL_USER", id: "user_123", displayName: "Ana" },
      entitlement: { plan: "PRO", status: "ACTIVE", contractVersion: 7 },
    });
  });

  it("rejects missing membership or inactive contracts", async () => {
    const missing = createRestSessionContextService({
      async findMembership() {
        return null;
      },
    });
    await expect(missing.resolve({ globalUserId: "user_123" })).rejects.toThrow("REST_TENANT_FORBIDDEN");

    const inactive = createRestSessionContextService({
      async findMembership() {
        return {
          globalUserId: "user_123",
          userName: "Ana",
          membershipStatus: "ACTIVE",
          tenantRole: "OWNER",
          globalTenantId: "tenant_123",
          tenantSlug: "casa-norte",
          tenantName: "Casa Norte",
          tenantStatus: "ACTIVE",
          contract: {
            status: "SUSPENDED",
            plan: "STARTER",
            pricingVersion: 1,
            limits: { branches: 1, localEmployees: 15, devices: 5, edgeInstallations: 1 },
          },
        };
      },
    });
    await expect(inactive.resolve({ globalUserId: "user_123" })).rejects.toThrow("REST_CONTRACT_INACTIVE");
  });

  it("signs the serialized context and rejects tampering", async () => {
    const payload = JSON.stringify({ globalTenantId: "tenant_123", contractVersion: 4 });
    const signature = signRestSessionContext(payload, "a-production-grade-signing-secret");

    expect(verifyRestSessionContextSignature(payload, signature, "a-production-grade-signing-secret")).toBe(true);
    expect(verifyRestSessionContextSignature(`${payload}x`, signature, "a-production-grade-signing-secret")).toBe(false);
  });

  it("protects Rest session and plan routes with the service token", async () => {
    const previousToken = process.env.SERVICE_TO_SERVICE_TOKEN;
    process.env.SERVICE_TO_SERVICE_TOKEN = "service-token";
    try {
      expect((await getSessionContext(new Request("https://app.vase.ar/api/internal/rest/session-context?userId=user_123"))).status).toBe(403);
      expect((await listRestPlans(new Request("https://app.vase.ar/api/internal/admin/rest/plans"))).status).toBe(403);
      expect((await mutateRestPlans(new Request("https://app.vase.ar/api/internal/admin/rest/plans", {
        method: "POST",
        body: "{}",
      }))).status).toBe(403);
    } finally {
      if (previousToken === undefined) delete process.env.SERVICE_TO_SERVICE_TOKEN;
      else process.env.SERVICE_TO_SERVICE_TOKEN = previousToken;
    }
  });
});

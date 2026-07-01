import { describe, expect, it, vi } from "vitest";

describe("Vase Labs internal entitlements route", () => {
  it("requires the service-to-service token before mutating entitlements", async () => {
    vi.resetModules();
    vi.doMock("../apps/vase-labs/app/lib/labs-entitlements-service", () => ({
      labsEntitlementsService: {
        upsertEntitlement: vi.fn(),
      },
    }));
    const previousToken = process.env.SERVICE_TO_SERVICE_TOKEN;
    process.env.SERVICE_TO_SERVICE_TOKEN = "test-service-token";

    try {
      const route = await import("../apps/vase-labs/app/api/internal/admin/labs/entitlements/route");
      const response = await route.POST(new Request("https://labs.vase.ar/api/internal/admin/labs/entitlements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ globalTenantId: "tenant_123" }),
      }));

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "FORBIDDEN" });
    } finally {
      vi.doUnmock("../apps/vase-labs/app/lib/labs-entitlements-service");
      if (previousToken === undefined) {
        delete process.env.SERVICE_TO_SERVICE_TOKEN;
      } else {
        process.env.SERVICE_TO_SERVICE_TOKEN = previousToken;
      }
    }
  });

  it("upserts an entitlement from an authorized internal request", async () => {
    vi.resetModules();
    const upsertEntitlement = vi.fn(async () => ({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      tokenPack: "BASIC",
      tokensIncluded: 250000,
      tokensUsed: 0,
      extraTokens: 500000,
      currentPeriodStart: null,
      renewsAt: null,
    }));
    vi.doMock("../apps/vase-labs/app/lib/labs-entitlements-service", () => ({
      labsEntitlementsService: {
        upsertEntitlement,
      },
    }));
    const previousToken = process.env.SERVICE_TO_SERVICE_TOKEN;
    process.env.SERVICE_TO_SERVICE_TOKEN = "test-service-token";

    try {
      const route = await import("../apps/vase-labs/app/api/internal/admin/labs/entitlements/route");
      const response = await route.POST(new Request("https://labs.vase.ar/api/internal/admin/labs/entitlements", {
        method: "POST",
        headers: {
          authorization: "Bearer test-service-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          globalTenantId: "tenant_123",
          plan: "GROWTH",
          status: "ACTIVE",
          enabledChannels: ["WHATSAPP", "INSTAGRAM"],
          tokenPack: "BASIC",
          tokensIncluded: 250000,
          extraTokens: 500000,
        }),
      }));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.entitlement.globalTenantId).toBe("tenant_123");
      expect(upsertEntitlement).toHaveBeenCalledWith(expect.objectContaining({
        globalTenantId: "tenant_123",
        plan: "GROWTH",
      }));
    } finally {
      vi.doUnmock("../apps/vase-labs/app/lib/labs-entitlements-service");
      if (previousToken === undefined) {
        delete process.env.SERVICE_TO_SERVICE_TOKEN;
      } else {
        process.env.SERVICE_TO_SERVICE_TOKEN = previousToken;
      }
    }
  });
});

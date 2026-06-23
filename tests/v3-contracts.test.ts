import { describe, expect, it } from "vitest";
import {
  aiHandoffRequestSchema,
  entitlementSchema,
  serviceHealthSchema,
  vaseServiceKeySchema,
} from "../packages/contracts/src/index";
import {
  assertServiceToken,
  createInternalAdminHealthPayload,
} from "../packages/internal-api/src/index";

describe("V3 contracts", () => {
  it("validates service health payloads", () => {
    const payload = serviceHealthSchema.parse({
      service: "vase-app",
      domain: "app.vase.ar",
      status: "ok",
      timestamp: "2026-06-23T10:00:00.000Z",
    });

    expect(payload.service).toBe("vase-app");
  });

  it("validates product entitlements", () => {
    const entitlement = entitlementSchema.parse({
      globalTenantId: "tenant_123",
      productKey: "management",
      status: "ACTIVE",
    });

    expect(entitlement.productKey).toBe("management");
  });

  it("validates AI handoff requests", () => {
    const handoff = aiHandoffRequestSchema.parse({
      tenantGlobalId: "tenant_123",
      productKey: "labs",
      conversationId: "conv_123",
      reason: "help.vase.ar had no answer",
    });

    expect(handoff.productKey).toBe("labs");
  });

  it("validates service-to-service tokens", () => {
    expect(() => assertServiceToken("Bearer secret", "secret")).not.toThrow();
    expect(() => assertServiceToken("Bearer wrong", "secret")).toThrow("FORBIDDEN");
  });

  it("creates internal admin health payloads for V3 services", () => {
    const payload = createInternalAdminHealthPayload({
      service: vaseServiceKeySchema.parse("vase-business"),
      domain: "business.vase.ar",
    });

    expect(payload.service).toBe("vase-business");
    expect(payload.status).toBe("ok");
  });
});

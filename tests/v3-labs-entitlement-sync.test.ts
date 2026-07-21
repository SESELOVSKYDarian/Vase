import { describe, expect, it, vi } from "vitest";
import { syncLabsEntitlementFromContext } from "../apps/vase-labs/app/lib/labs-entitlement-sync";

describe("Labs entitlement sync from App context", () => {
  it("persists the App-projected entitlement so unauthenticated webhooks can run AI", async () => {
    const upsertEntitlement = vi.fn(async () => ({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP", "INSTAGRAM"],
    }));

    await syncLabsEntitlementFromContext({
      context: {
        globalTenantId: "tenant_123",
        entitlement: {
          plan: "GROWTH",
          status: "ACTIVE",
          enabledChannels: ["WHATSAPP", "INSTAGRAM"],
          channelLimits: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 0 },
        },
      },
      entitlements: { upsertEntitlement },
    });

    expect(upsertEntitlement).toHaveBeenCalledWith({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      channelLimits: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 0 },
    });
  });
});

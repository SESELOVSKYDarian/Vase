import { describe, expect, it } from "vitest";
import { buildLabsWorkspaceEntitlementData } from "@/lib/admin/client-product-access";
import { resolveLabsAdminWorkspaceEntitlement } from "@/server/services/labs-admin";
import { resolveLabsSessionWorkspaceEntitlement } from "@/server/services/labs-session-context";

describe("Labs entitlement producer and consumers", () => {
  it("round-trips plan-derived Growth limits without presenting them as a manual override", () => {
    const produced = buildLabsWorkspaceEntitlementData("GROWTH");
    const storedWorkspace = {
      paidPlan: "GROWTH",
      channelLimits: produced.channelLimits,
      channelOverrideReason: null,
      channelOverrideBy: null,
      channelOverrideAt: null,
    } as const;
    const sessionContext = resolveLabsSessionWorkspaceEntitlement(storedWorkspace);
    const labsAdmin = resolveLabsAdminWorkspaceEntitlement(storedWorkspace);

    expect(produced.channelLimits).toEqual({ WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 1 });
    expect(sessionContext).toMatchObject({
      channelLimits: produced.channelLimits,
      enabledChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
    });
    expect(labsAdmin).toMatchObject({
      channelLimits: produced.channelLimits,
      manualOverride: false,
      overrideReason: null,
    });
  });

  it("recognizes a manual override only when its provenance metadata is complete", () => {
    const consumed = resolveLabsAdminWorkspaceEntitlement({
      paidPlan: "STARTER",
      channelLimits: { WHATSAPP: 2, INSTAGRAM: 1, FACEBOOK: 0 },
      channelOverrideReason: "Temporary capacity increase",
      channelOverrideBy: "admin-1",
      channelOverrideAt: new Date("2026-08-04T12:00:00.000Z"),
    });

    expect(consumed).toMatchObject({
      channelLimits: { WHATSAPP: 2, INSTAGRAM: 1, FACEBOOK: 0 },
      manualOverride: true,
      overrideReason: "Temporary capacity increase",
      overrideUpdatedBy: "admin-1",
      overrideUpdatedAt: "2026-08-04T12:00:00.000Z",
    });
  });
});

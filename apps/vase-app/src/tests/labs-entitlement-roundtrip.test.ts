import { describe, expect, it } from "vitest";
import { getEffectiveLabsEntitlement, type LabsPlan } from "@vase/contracts";
import { buildLabsWorkspaceEntitlementData } from "@/lib/admin/client-product-access";
import { resolveLabsAdminWorkspaceEntitlement } from "@/server/services/labs-admin";
import { resolveLabsSessionWorkspaceEntitlement } from "@/server/services/labs-session-context";
import {
  resolveLabsCommercialStatus,
  resolveStoredLabsEntitlementPlan,
} from "@/server/services/labs-entitlement-state";

const expectedChannels: Record<LabsPlan, { WHATSAPP: number; INSTAGRAM: number; FACEBOOK: number }> = {
  STARTER: { WHATSAPP: 1, INSTAGRAM: 0, FACEBOOK: 0 },
  PRO: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 0 },
  GROWTH: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 1 },
};

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

    expect(resolveLabsAdminWorkspaceEntitlement({
      paidPlan: "STARTER",
      channelLimits: { WHATSAPP: 9, INSTAGRAM: 9, FACEBOOK: 9 },
      channelOverrideReason: null,
      channelOverrideBy: null,
      channelOverrideAt: null,
    })).toMatchObject({
      channelLimits: expectedChannels.STARTER,
      manualOverride: false,
    });
  });

  it.each(Object.entries(expectedChannels) as Array<[LabsPlan, typeof expectedChannels[LabsPlan]]>)(
    "uses the canonical %s channel policy for contracts, provisioning, null and invalid storage",
    (plan, expected) => {
      expect(getEffectiveLabsEntitlement({ paidPlan: plan }).channelLimits).toEqual(expected);
      expect(buildLabsWorkspaceEntitlementData(plan).channelLimits).toEqual(expected);
      for (const channelLimits of [null, { whatsapp: 1 }, "invalid"] as const) {
        expect(resolveLabsSessionWorkspaceEntitlement({
          paidPlan: plan,
          channelLimits,
          channelOverrideReason: null,
          channelOverrideBy: null,
          channelOverrideAt: null,
        }).channelLimits).toEqual(expected);
      }
    },
  );

  it("uses entitlementPlan as authority and limits legacy fallback to an explicit missing value", () => {
    expect(resolveStoredLabsEntitlementPlan({ entitlementPlan: "GROWTH", legacyPlan: "START" })).toBe("GROWTH");
    expect(resolveStoredLabsEntitlementPlan({ entitlementPlan: null, legacyPlan: "PREMIUM" })).toBe("PRO");
    expect(resolveStoredLabsEntitlementPlan({ entitlementPlan: null, legacyPlan: "START" })).toBe("STARTER");
  });

  it("derives Labs lifecycle from active module and selected submodule commercial state", () => {
    expect(resolveLabsCommercialStatus({
      module: { isActive: true, commercialStatus: "ACTIVE" },
      submodule: { isActive: true, commercialStatus: "TRIAL" },
    })).toBe("TRIAL");
    expect(resolveLabsCommercialStatus({
      module: { isActive: true, commercialStatus: "ACTIVE" },
      submodule: { isActive: true, commercialStatus: "ACTIVE" },
    })).toBe("ACTIVE");
    expect(resolveLabsCommercialStatus({
      module: { isActive: false, commercialStatus: "ACTIVE" },
      submodule: { isActive: true, commercialStatus: "ACTIVE" },
    })).toBe("SUSPENDED");
  });
});

import { describe, expect, it } from "vitest";
import { deriveStorefrontLifecycle } from "@/lib/business/lifecycle";
import { DEFAULT_BUSINESS_PLAN, getPlanLimits } from "@/lib/business/plans";

describe("business rules", () => {
  it("derives grace period for expired temporary pages", () => {
    const now = new Date("2026-04-01T12:00:00.000Z");
    const result = deriveStorefrontLifecycle(
      {
        isTemporary: true,
        expiresAt: new Date("2026-03-30T12:00:00.000Z"),
        graceEndsAt: new Date("2026-04-06T12:00:00.000Z"),
      },
      now,
    );

    expect(result.phase).toBe("grace");
    expect(result.shouldDelete).toBe(false);
  });

  it("signals deletion after grace period", () => {
    const now = new Date("2026-04-10T12:00:00.000Z");
    const result = deriveStorefrontLifecycle(
      {
        isTemporary: true,
        expiresAt: new Date("2026-03-30T12:00:00.000Z"),
        graceEndsAt: new Date("2026-04-06T12:00:00.000Z"),
      },
      now,
    );

    expect(result.phase).toBe("delete");
    expect(result.shouldDelete).toBe(true);
  });

  it("exposes stricter limits on start plan", () => {
    const limits = getPlanLimits(DEFAULT_BUSINESS_PLAN);

    expect(limits.maxPages).toBe(3);
    expect(limits.canUseCustomDomain).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { getPlatformModuleByKey, platformModules } from "../apps/vase-app/src/config/modules";

describe("Vase Management platform module", () => {
  it("registers Management as a monthly module with an implementation price", () => {
    const management = getPlatformModuleByKey("management");

    expect(platformModules.map((module) => module.id)).toContain("vase_management");
    expect(management).toMatchObject({
      id: "vase_management",
      key: "management",
      product: "MANAGEMENT",
      route: "/app/management",
      activationMode: "manual",
      billing: { type: "monthly", currency: "ARS" },
    });
    expect(management?.defaultPricing.price).toBeGreaterThan(0);
    expect(management?.billing.setupFrom).toBeGreaterThan(0);
  });
});

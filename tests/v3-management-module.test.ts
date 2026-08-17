import { describe, expect, it } from "vitest";
import { getPlatformModuleByKey, platformModules } from "../apps/vase-app/src/config/modules";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

  it("surfaces Management on the central project dashboard", () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), "apps/vase-app/src/components/platform/modules-dashboard.tsx"),
      "utf8",
    );

    expect(dashboardSource).toContain('dashboard.modules.find((module) => module.key === "management")');
    expect(dashboardSource).toContain("Abrir Vase Management");
  });
});

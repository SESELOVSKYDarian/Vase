import { describe, expect, it } from "vitest";
import { getLabsPlanCatalog } from "@/lib/admin/labs-plan-catalog";

describe("Labs plan catalog selection", () => {
  it("uses the canonical vase_labs module when a duplicate empty Labs module exists", () => {
    const plans = getLabsPlanCatalog([
      {
        id: "legacy-labs",
        product: "LABS",
        submodules: [],
      },
      {
        id: "vase_labs",
        product: "LABS",
        submodules: [
          { id: "labs-pro", key: "pro", name: "Pro" },
          { id: "labs-growth", key: "growth", name: "Growth" },
          { id: "labs-starter", key: "starter", name: "Starter" },
        ],
      },
    ]);

    expect(plans.map((plan) => plan.plan)).toEqual(["STARTER", "PRO", "GROWTH"]);
    expect(plans.map((plan) => plan.submoduleId)).toEqual(["labs-starter", "labs-pro", "labs-growth"]);
  });
});

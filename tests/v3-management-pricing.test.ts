import { describe, expect, it } from "vitest";
import { resolveManagementContractPrice, selectPublishedManagementPricing } from "../apps/vase-app/src/lib/management/pricing";

describe("Management pricing", () => {
  it("selects only the latest published version", () => {
    const selected = selectPublishedManagementPricing([
      { version: 3, status: "DRAFT", setupPrice: 500, monthlyPrice: 50 },
      { version: 2, status: "PUBLISHED", setupPrice: 400, monthlyPrice: 40 },
      { version: 1, status: "ARCHIVED", setupPrice: 300, monthlyPrice: 30 },
    ]);
    expect(selected?.version).toBe(2);
  });

  it("preserves agreed pricing unless an audited override is supplied", () => {
    expect(resolveManagementContractPrice({ setupPrice: 400, monthlyPrice: 40 })).toEqual({ setupPrice: 400, monthlyPrice: 40, overridden: false });
    expect(resolveManagementContractPrice({ setupPrice: 400, monthlyPrice: 40 }, { setupPrice: 350, monthlyPrice: 35, reason: "Acuerdo comercial anual" })).toEqual({ setupPrice: 350, monthlyPrice: 35, overridden: true });
  });
});

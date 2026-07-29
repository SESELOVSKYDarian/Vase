import { describe, expect, it } from "vitest";
import { resolveProductPrice } from "../apps/vase-rest/app/lib/catalog/pricing-service";

describe("Rest scoped product pricing", () => {
  it("uses branch override before group and tenant prices without floating point money", () => {
    expect(resolveProductPrice({
      tenant: { amount: "12000.00", currency: "ARS", revision: 1 },
      groups: [{ amount: "12500.00", currency: "ARS", revision: 2 }],
      branch: { amount: "13000.50", currency: "ARS", revision: 3 },
    })).toEqual({
      amount: "13000.50",
      currency: "ARS",
      source: "BRANCH",
      revision: 3,
      overridden: true,
    });
    expect(() => resolveProductPrice({
      tenant: { amount: "12.999", currency: "ARS", revision: 1 },
      groups: [],
      branch: null,
    })).toThrow("REST_PRICE_INVALID");
  });
});

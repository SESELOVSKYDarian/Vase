import { describe, expect, it } from "vitest";
import { splitTax } from "../apps/vase-rest/app/lib/fiscal/tax-calculation";

describe("Rest tax snapshots", () => {
  it("splits tax-included Argentine prices using decimal rounding", () => {
    expect(splitTax({ gross: "1210.00", rate: "21.00", included: true }))
      .toEqual({ gross: "1210.00", net: "1000.00", tax: "210.00" });
  });

  it("adds tax to net prices and preserves zero-rated products", () => {
    expect(splitTax({ gross: "1000.00", rate: "10.50", included: false }))
      .toEqual({ gross: "1105.00", net: "1000.00", tax: "105.00" });
    expect(splitTax({ gross: "800.00", rate: "0.00", included: true }))
      .toEqual({ gross: "800.00", net: "800.00", tax: "0.00" });
  });
});

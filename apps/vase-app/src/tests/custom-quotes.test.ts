import { describe, expect, it } from "vitest";
import {
  buildQuoteLineItems,
  calculateQuoteTotals,
  formatMoneyFromCents,
  getQuoteStatusLabel,
} from "@/lib/business/custom-quotes";

describe("custom quotes", () => {
  it("builds line items and totals by category", () => {
    const lines = buildQuoteLineItems({
      baseTemplateAmountUnits: 1500,
      featureExtraAmountUnits: 300,
      designExtraAmountUnits: 200,
      integrationExtraAmountUnits: 450,
      serviceExtraAmountUnits: 100,
    });
    const totals = calculateQuoteTotals(lines);

    expect(lines).toHaveLength(5);
    expect(totals.baseAmountCents).toBe(150000);
    expect(totals.extrasAmountCents).toBe(105000);
    expect(totals.totalAmountCents).toBe(255000);
  });

  it("formats quote amounts for business-friendly display", () => {
    expect(formatMoneyFromCents(255000, "USD")).toMatch(/2[.,]550/);
  });

  it("maps statuses to clear labels", () => {
    expect(getQuoteStatusLabel("PENDING_CLIENT")).toBe("Pendiente de cliente");
  });
});

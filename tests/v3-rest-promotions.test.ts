import { describe, expect, it } from "vitest";
import { applyBestRestPromotion, priceRestOrderItem } from "@vase/contracts";
import { allowedPromotionTenderTypes } from "../apps/vase-rest/app/lib/promotions/promotion-tender-policy";

describe("Rest promotions", () => {
  it("applies the highest-priority eligible scoped promotion deterministically", () => {
    const result = applyBestRestPromotion({
      now: new Date("2026-07-28T15:00:00.000Z"),
      timezone: "America/Argentina/Buenos_Aires",
      globalTenantId: "tenant",
      branchId: "branch",
      branchGroupIds: ["group"],
      productId: "product",
      quantity: 2,
      gross: "1000.00",
      paymentMethod: "CASH",
      promotions: [{
        id: "promo", code: "ALMUERZO", scopeType: "BRANCH_GROUP", scopeId: "group",
        discountType: "PERCENTAGE", discountValue: "10.0000",
        productIds: ["product"], paymentMethods: ["CASH"], weekdays: [2],
        minimumQuantity: 1, startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-08-01T00:00:00.000Z"), priority: 10, active: true,
      }],
    });
    expect(result).toEqual({
      promotionIds: ["promo"],
      discountTotal: "100.00",
      discountedGross: "900.00",
    });
  });

  it("requires the matching payment method and caps fixed discounts at gross", () => {
    const base = {
      now: new Date("2026-07-28T15:00:00.000Z"),
      timezone: "America/Argentina/Buenos_Aires",
      globalTenantId: "tenant",
      branchId: "branch",
      branchGroupIds: [],
      productId: "product",
      quantity: 2,
      gross: "100.00",
      promotions: [{
        id: "promo", code: "EFECTIVO", scopeType: "TENANT", scopeId: "tenant",
        discountType: "FIXED_PER_UNIT" as const, discountValue: "80.0000",
        productIds: [], paymentMethods: ["CASH"], weekdays: [],
        minimumQuantity: 1, startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-08-01T00:00:00.000Z"), priority: 1, active: true,
      }],
    };
    expect(applyBestRestPromotion(base)).toMatchObject({
      promotionIds: [], discountTotal: "0.00", discountedGross: "100.00",
    });
    expect(applyBestRestPromotion({ ...base, paymentMethod: "CASH" })).toMatchObject({
      promotionIds: ["promo"], discountTotal: "100.00", discountedGross: "0.00",
    });
  });

  it("applies discounts to the tax-inclusive gross for tax-exclusive prices", () => {
    expect(priceRestOrderItem({
      unitPrice: "100.00",
      modifierTotal: "0.00",
      quantity: 2,
      taxRate: "21.00",
      taxIncluded: false,
      promotion: {
        now: new Date("2026-07-28T15:00:00.000Z"),
        timezone: "UTC",
        globalTenantId: "tenant",
        branchId: "branch",
        branchGroupIds: [],
        productId: "product",
        paymentMethod: "CASH",
        promotions: [{
          id: "promo", code: "TEN", scopeType: "TENANT", scopeId: "tenant",
          discountType: "PERCENTAGE", discountValue: "10.0000",
          productIds: [], paymentMethods: [], weekdays: [], minimumQuantity: 1,
          startsAt: "2026-01-01T00:00:00.000Z",
          endsAt: "2027-01-01T00:00:00.000Z",
          priority: 1, active: true,
        }],
      },
    })).toEqual({
      grossBeforeDiscount: "242.00",
      discountTotal: "24.20",
      promotionIds: ["promo"],
      lineTotal: "217.80",
      netTotal: "180.00",
      taxAmount: "37.80",
    });
  });

  it("intersects tender restrictions across all promotions on an order", () => {
    expect(allowedPromotionTenderTypes({
      promotionIds: ["cash-or-mp", "cash-only"],
      promotions: [
        { id: "cash-or-mp", paymentMethods: ["CASH", "MERCADO_PAGO"] },
        { id: "cash-only", paymentMethods: ["CASH"] },
      ],
    })).toEqual(["CASH"]);
    expect(allowedPromotionTenderTypes({
      promotionIds: ["unrestricted"],
      promotions: [{ id: "unrestricted", paymentMethods: [] }],
    })).toBeUndefined();
  });
});

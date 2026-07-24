import { describe, expect, it } from "vitest";
import { buildLabsOrderAnalytics } from "../apps/vase-labs/app/lib/order-analytics";

describe("Labs order analytics", () => {
  it("aggregates counts, conversion and totals by messaging channel and currency", () => {
    const analytics = buildLabsOrderAnalytics([
      { channel: "WHATSAPP", status: "CONFIRMED", currency: "ARS", totalAmount: 1000, businessUpdatedAt: new Date("2026-07-23T12:00:00.000Z") },
      { channel: "WHATSAPP", status: "PENDING", currency: "ARS", totalAmount: 500, businessUpdatedAt: new Date("2026-07-23T12:10:00.000Z") },
      { channel: "INSTAGRAM", status: "CONFIRMED", currency: "ARS", totalAmount: 2000, businessUpdatedAt: new Date("2026-07-23T12:20:00.000Z") },
      { channel: "MESSENGER", status: "CONFIRMED", currency: "USD", totalAmount: 50, businessUpdatedAt: new Date("2026-07-23T12:30:00.000Z") },
    ]);

    expect(analytics.totalOrders).toBe(4);
    expect(analytics.channels.WHATSAPP).toMatchObject({ orders: 2, confirmed: 1, conversionRate: 50 });
    expect(analytics.channels.INSTAGRAM).toMatchObject({ orders: 1, confirmed: 1, conversionRate: 100 });
    expect(analytics.totalsByCurrency).toEqual([
      { currency: "ARS", total: 3500, orders: 3 },
      { currency: "USD", total: 50, orders: 1 },
    ]);
  });
});

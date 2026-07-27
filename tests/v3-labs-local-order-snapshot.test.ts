import { describe, expect, it } from "vitest";
import { enrichLocalOrderSnapshot, publicOrderNumber } from "../apps/vase-labs/app/lib/local-order-snapshot";

describe("Labs local order snapshots", () => {
  it("copies catalog prices and calculates the visible total", () => {
    const order = enrichLocalOrderSnapshot({
      id: "labs-local:conversation_1",
      orderNumber: "LABS-696730",
      currency: "ARS",
      items: [{ productId: "1005", name: "1005", quantity: 2 }],
      shippingAmount: 500,
    }, [{
      externalProductId: "1005",
      sku: "1005",
      name: "BOQUILLA 25 MM LAFUS",
      price: 10723.48,
      imageUrl: "https://example.com/boquilla.jpg",
    }]);

    expect(order.items).toEqual([expect.objectContaining({
      productId: "1005",
      sku: "1005",
      name: "BOQUILLA 25 MM LAFUS",
      quantity: 2,
      unitPrice: 10723.48,
      totalAmount: 21446.96,
    })]);
    expect(order.subtotalAmount).toBe(21446.96);
    expect(order.shippingAmount).toBe(500);
    expect(order.totalAmount).toBe(21946.96);
  });

  it("does not invent a zero amount when a catalog product is missing", () => {
    expect(() => enrichLocalOrderSnapshot({
      id: "labs-local:conversation_1",
      orderNumber: "LABS-696730",
      items: [{ productId: "missing", name: "missing", quantity: 1 }],
    }, [])).toThrow("CATALOG_PRODUCT_NOT_FOUND:missing");
  });

  it("hides the technical Labs prefix from customers", () => {
    expect(publicOrderNumber("LABS-696730")).toBe("696730");
  });
});

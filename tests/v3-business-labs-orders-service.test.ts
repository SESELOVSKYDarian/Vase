import { describe, expect, it, vi } from "vitest";
import {
  buildLabsOrderQuote,
  createLabsOrderFromConfirmedQuote,
  listLabsFulfillmentOptions,
  normalizeLabsOrderChannel,
} from "../apps/vase-app/src/server/services/labs-business-orders";

function checkout(overrides: Partial<Awaited<ReturnType<typeof baseCheckout>>> = {}) {
  return { ...baseCheckout(), ...overrides };
}

function baseCheckout() {
  return {
    valid: true as const,
    errors: [] as string[],
    currency: "ARS",
    subtotal: 2000,
    shippingAmount: 500,
    total: 2500,
    shippingQuote: { ok: true as const, amount: 500, zoneId: "zone_1", zoneType: "FLAT", branchId: "branch_1", distanceKm: null },
    items: [{
      productId: "prod_1",
      sku: "SKU-1",
      name: "Producto",
      quantity: 2,
      unitPrice: 1000,
      totalAmount: 2000,
      currency: "ARS",
      snapshot: { images: ["https://uploads.vase.ar/p.png"] },
    }],
  };
}

const deps = () => ({
  findTenant: vi.fn(async (globalTenantId: string) => ({ id: globalTenantId })),
  validateCheckoutItems: vi.fn(async () => checkout()),
  listShippingBranchesByTenant: vi.fn(async () => [{ id: "branch_1", name: "Centro", address: "Av. Siempre Viva", hours: "9 a 18", phone: null, pickupFee: 0, enabled: true }]),
  listShippingZonesByTenant: vi.fn(async () => [{ id: "zone_1", name: "CABA", description: null, type: "FLAT", price: 500, branchId: "branch_1", enabled: true }]),
  createOrderFromCheckout: vi.fn(async () => ({
    order: {
      id: "order_1",
      orderNumber: "V-100",
      status: "PENDING",
      orderChannel: "INSTAGRAM",
      currency: "ARS",
      subtotalAmount: 2000,
      shippingAmount: 500,
      totalAmount: 2500,
      customerName: "Ana",
      customerEmail: null,
      customerPhone: "+5491111111111",
      createdAt: new Date("2026-07-23T12:00:00.000Z"),
      updatedAt: new Date("2026-07-23T12:00:00.000Z"),
      items: [],
    },
    checkout: checkout(),
    checkoutMethodLabel: "Manual",
    orderChannelLabel: "Instagram",
  })),
  findOrderByIdempotencyKey: vi.fn(async () => null),
});

describe("Labs Business order broker service", () => {
  it("normalizes all Labs messaging channels without falling back to Web", () => {
    expect(normalizeLabsOrderChannel("WHATSAPP")).toBe("whatsapp");
    expect(normalizeLabsOrderChannel("INSTAGRAM")).toBe("instagram");
    expect(normalizeLabsOrderChannel("MESSENGER")).toBe("messenger");
  });

  it("returns Business fulfillment options from existing shipping configuration", async () => {
    const d = deps();
    const result = await listLabsFulfillmentOptions({ globalTenantId: "tenant_123" }, d);

    expect(d.findTenant).toHaveBeenCalledWith("tenant_123");
    expect(d.listShippingBranchesByTenant).toHaveBeenCalledWith("tenant_123");
    expect(d.listShippingZonesByTenant).toHaveBeenCalledWith("tenant_123");
    expect(result.branches[0]).toMatchObject({ id: "branch_1", name: "Centro" });
    expect(result.deliveryZones[0]).toMatchObject({ id: "zone_1", name: "CABA" });
  });

  it("builds a versioned quote hash from Business checkout validation", async () => {
    const d = deps();
    const result = await buildLabsOrderQuote({
      globalTenantId: "tenant_123",
      channel: "WHATSAPP",
      items: [{ productId: "prod_1", quantity: 2 }],
      customer: { shippingLocation: { latitude: -34.6, longitude: -58.4 } },
      fulfillment: { type: "DELIVERY" },
    }, d);

    expect(d.validateCheckoutItems).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "tenant_123",
      items: [{ productId: "prod_1", quantity: 2 }],
      shippingCustomer: expect.any(Object),
    }));
    expect(result.quoteVersion).toBeGreaterThan(0);
    expect(result.quoteHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.total).toBe(2500);
  });

  it("creates a confirmed order once and returns the existing order for duplicate idempotency keys", async () => {
    const d = deps();
    const request = {
      globalTenantId: "tenant_123",
      idempotencyKey: "conv_1:rev_1",
      channel: "INSTAGRAM" as const,
      items: [{ productId: "prod_1", quantity: 2 }],
      customer: { name: "Ana", phone: "+5491111111111" },
      quoteVersion: 1,
      quoteHash: "placeholder",
    };
    const quote = await buildLabsOrderQuote(request, d);
    const created = await createLabsOrderFromConfirmedQuote({ ...request, quoteVersion: quote.quoteVersion, quoteHash: quote.quoteHash }, d);

    expect(d.createOrderFromCheckout).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "tenant_123",
      preferredBranchId: undefined,
      requestedOrderChannel: "instagram",
      notes: expect.stringContaining("conv_1:rev_1"),
    }));
    expect(created.idempotent).toBe(false);

    d.findOrderByIdempotencyKey.mockResolvedValueOnce(created.order);
    const duplicate = await createLabsOrderFromConfirmedQuote({ ...request, quoteVersion: quote.quoteVersion, quoteHash: quote.quoteHash }, d);
    expect(duplicate.idempotent).toBe(true);
  });
});

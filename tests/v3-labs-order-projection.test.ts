import { describe, expect, it, vi } from "vitest";
import { normalizeBusinessOrderSnapshot, upsertBusinessOrderProjection } from "../apps/vase-labs/app/lib/order-projection";

describe("Labs order projection", () => {
  it("normalizes Business orders without fuzzy customer matching", () => {
    const order = normalizeBusinessOrderSnapshot({
      id: "order_1",
      orderNumber: "V-100",
      orderChannel: "INSTAGRAM",
      status: "PENDING",
      currency: "ARS",
      totalAmount: "1200.50",
      customerName: "Ana",
      customerEmail: "ANA@MAIL.COM ",
      customerPhone: "+54 9 11 1234",
      updatedAt: "2026-07-23T12:00:00.000Z",
      items: [{ sku: "SKU-1", name: "Producto", quantity: 1 }],
    });

    expect(order).toMatchObject({
      businessOrderId: "order_1",
      orderNumber: "V-100",
      channel: "INSTAGRAM",
      customerEmailNormalized: "ana@mail.com",
      customerPhoneNormalized: "549111234",
    });
    expect(order).not.toHaveProperty("customerNameNormalized");
  });

  it("upserts newer versions and ignores stale snapshots", async () => {
    const repo = {
      findByBusinessOrderId: vi.fn(async () => ({ businessOrderId: "order_1", version: 20 })),
      upsert: vi.fn(),
    };

    const stale = await upsertBusinessOrderProjection({
      globalTenantId: "tenant_1",
      version: 10,
      order: { id: "order_1", orderNumber: "V-100", updatedAt: "2026-07-23T12:00:00.000Z" },
    }, repo);

    expect(stale).toEqual({ processed: false, reason: "STALE_VERSION" });
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});

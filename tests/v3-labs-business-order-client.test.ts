import { describe, expect, it, vi } from "vitest";
import { createBusinessOrderClient } from "../apps/vase-labs/app/lib/business-order-client";

describe("Labs Business order client", () => {
  it("calls Vase App internal fulfillment dynamically by tenant", async () => {
    const fetcher = vi.fn(async () => Response.json({ branches: [], deliveryZones: [] }));
    const client = createBusinessOrderClient({
      appInternalUrl: "http://app-vase:3002",
      serviceToken: "secret",
      fetcher: fetcher as typeof fetch,
    });

    await client.getFulfillment("tenant/1");

    expect(fetcher).toHaveBeenCalledWith(
      "http://app-vase:3002/api/internal/business/labs/fulfillment?globalTenantId=tenant%2F1",
      { headers: { authorization: "Bearer secret" }, signal: expect.any(AbortSignal) },
    );
  });

  it("throws without internal configuration instead of using a fixed public API URL", async () => {
    const client = createBusinessOrderClient({ appInternalUrl: "", serviceToken: "", fetcher: vi.fn() as typeof fetch });
    await expect(client.quote({
      globalTenantId: "tenant_1",
      channel: "WHATSAPP",
      items: [{ productId: "prod_1", quantity: 1 }],
      customer: {},
    })).rejects.toThrow("BUSINESS_ORDER_CLIENT_UNAVAILABLE");
  });

  it("posts create requests with the service token", async () => {
    const fetcher = vi.fn(async () => Response.json({ order: { id: "order_1" } }));
    const client = createBusinessOrderClient({
      appInternalUrl: "http://app-vase:3002",
      serviceToken: "secret",
      fetcher: fetcher as typeof fetch,
    });

    await client.create({
      globalTenantId: "tenant_1",
      idempotencyKey: "conv_1:rev_1",
      channel: "INSTAGRAM",
      items: [{ productId: "prod_1", quantity: 1 }],
      customer: { name: "Ana" },
      quoteHash: "quote_hash_1",
      quoteVersion: 1,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "http://app-vase:3002/api/internal/business/labs/orders",
      expect.objectContaining({
        method: "POST",
        headers: { authorization: "Bearer secret", "content-type": "application/json" },
      }),
    );
  });
});

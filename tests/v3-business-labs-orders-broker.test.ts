import { describe, expect, it, vi } from "vitest";

const { service } = vi.hoisted(() => ({
  service: {
    listLabsFulfillmentOptions: vi.fn(),
    buildLabsOrderQuote: vi.fn(),
    createLabsOrderFromConfirmedQuote: vi.fn(),
    listLabsOrderSnapshot: vi.fn(),
  },
}));

vi.mock("../apps/vase-app/src/server/services/labs-business-orders", () => service);
vi.mock("@/server/services/labs-business-orders", () => service);

import { createLabsFulfillmentRouteHandler } from "../apps/vase-app/src/app/api/internal/business/labs/fulfillment/route";
import { createLabsOrderQuoteRouteHandler } from "../apps/vase-app/src/app/api/internal/business/labs/orders/quote/route";
import { createLabsOrderCreateRouteHandler } from "../apps/vase-app/src/app/api/internal/business/labs/orders/route";

function request(url: string, init?: RequestInit) {
  return new Request(url, { headers: { authorization: "Bearer service-token", "content-type": "application/json" }, ...init });
}

describe("Vase App Labs order broker routes", () => {
  it("requires service authentication before invoking order services", async () => {
    const GET = createLabsFulfillmentRouteHandler({
      authorize: () => { throw new Error("FORBIDDEN"); },
      listFulfillment: service.listLabsFulfillmentOptions,
    });

    const response = await GET(request("http://app-vase:3002/api/internal/business/labs/fulfillment?globalTenantId=tenant_123"));
    expect(response.status).toBe(403);
    expect(service.listLabsFulfillmentOptions).not.toHaveBeenCalled();
  });

  it("resolves fulfillment by global tenant id only", async () => {
    service.listLabsFulfillmentOptions.mockResolvedValueOnce({ globalTenantId: "tenant_123", branches: [], deliveryZones: [] });
    const GET = createLabsFulfillmentRouteHandler({
      authorize: vi.fn(),
      listFulfillment: service.listLabsFulfillmentOptions,
    });

    const response = await GET(request("http://app-vase:3002/api/internal/business/labs/fulfillment?globalTenantId=tenant_123&businessUrl=https://attacker.test"));
    expect(response.status).toBe(200);
    expect(service.listLabsFulfillmentOptions).toHaveBeenCalledWith({ globalTenantId: "tenant_123" });
  });

  it("validates quote payloads and does not pass caller-controlled URLs", async () => {
    service.buildLabsOrderQuote.mockResolvedValueOnce({ quoteHash: "h", quoteVersion: 1, total: 1 });
    const POST = createLabsOrderQuoteRouteHandler({
      authorize: vi.fn(),
      quote: service.buildLabsOrderQuote,
    });

    const response = await POST(request("http://app-vase:3002/api/internal/business/labs/orders/quote", {
      method: "POST",
      body: JSON.stringify({
        globalTenantId: "tenant_123",
        businessUrl: "https://attacker.test",
        channel: "WHATSAPP",
        items: [{ productId: "prod_1", quantity: 1 }],
        customer: {},
      }),
    }));

    expect(response.status).toBe(400);
    expect(service.buildLabsOrderQuote).not.toHaveBeenCalled();
  });

  it("creates orders through the confirmed quote service", async () => {
    service.createLabsOrderFromConfirmedQuote.mockResolvedValueOnce({ order: { id: "order_1" }, idempotent: false });
    const POST = createLabsOrderCreateRouteHandler({
      authorize: vi.fn(),
      createOrder: service.createLabsOrderFromConfirmedQuote,
    });

    const response = await POST(request("http://app-vase:3002/api/internal/business/labs/orders", {
      method: "POST",
      body: JSON.stringify({
        globalTenantId: "tenant_123",
        idempotencyKey: "conv_1:rev_1",
        channel: "MESSENGER",
        items: [{ productId: "prod_1", quantity: 1 }],
        customer: { name: "Ana" },
        quoteHash: "quote_hash_1",
        quoteVersion: 1,
      }),
    }));

    expect(response.status).toBe(200);
    expect(service.createLabsOrderFromConfirmedQuote).toHaveBeenCalledWith(expect.objectContaining({
      globalTenantId: "tenant_123",
      channel: "MESSENGER",
    }));
  });
});

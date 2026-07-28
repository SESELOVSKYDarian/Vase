import { describe, expect, it, vi } from "vitest";
import { createDeliveryWebhookService } from "../apps/vase-rest/app/lib/delivery/webhook-service";

describe("Rest delivery webhooks", () => {
  it("verifies through the certified adapter and stores an event once", async () => {
    const store = vi.fn(async (value) => value);
    const service = createDeliveryWebhookService({
      findEvent: async () => null,
      getConnection: async () => ({
        id: "connection_1",
        globalTenantId: "tenant_1",
        status: "ACTIVE",
        provider: "CERTIFIED_PROVIDER",
      }),
      adapterFor: () => ({
        verifyWebhook: async () => ({
          eventId: "event_1",
          eventType: "ORDER_CREATED",
          providerOrderId: "provider_order_1",
        }),
        fetchOrder: async () => ({
          providerOrderId: "provider_order_1",
          status: "RECEIVED",
          total: "1500.00",
          currency: "ARS",
          items: [{ sku: "BURGER", name: "Burger", quantity: 1, unitPrice: "1500.00" }],
          providerPayload: { id: "provider_order_1" },
        }),
      }),
      store,
    });
    await service.accept({
      connectionId: "connection_1",
      rawBody: "{\"id\":\"event_1\"}",
      headers: { authorization: "signature" },
    });
    expect(store).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "event_1",
      normalizedOrder: expect.objectContaining({
        providerOrderId: "provider_order_1",
        total: "1500.00",
      }),
    }));
  });

  it("never accepts a webhook without an active certified adapter", async () => {
    const service = createDeliveryWebhookService({
      findEvent: async () => null,
      getConnection: async () => ({
        id: "connection_1",
        globalTenantId: "tenant_1",
        status: "PENDING_APPROVAL",
        provider: "GLOVO",
      }),
      adapterFor: () => null,
      store: vi.fn(),
    });
    await expect(service.accept({
      connectionId: "connection_1",
      rawBody: "{}",
      headers: {},
    })).rejects.toThrow("REST_DELIVERY_CONNECTION_INACTIVE");
  });
});

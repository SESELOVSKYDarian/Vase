import { describe, expect, it, vi } from "vitest";
import { changeOrderOperationalStatus } from "../apps/vase-labs/app/lib/order-operations";

describe("Labs order operations", () => {
  it("marks an order ready and notifies the linked customer", async () => {
    const saveStatus = vi.fn(async () => undefined);
    const notifyReady = vi.fn(async () => ({ ok: true as const }));
    const result = await changeOrderOperationalStatus({
      globalTenantId: "tenant_1",
      orderId: "order_1",
      status: "READY",
    }, {
      loadOrder: vi.fn(async () => ({
        id: "order_1", orderNumber: "LABS-696730", operationalStatus: "PROCESSING",
        conversationId: "conversation_1", fulfillment: { pickupLabel: "El Teflón Central" },
      })),
      saveStatus,
      notifyReady,
    });

    expect(notifyReady).toHaveBeenCalledWith(expect.objectContaining({
      text: "¡Tu pedido N.º 696730 ya está listo! Podés retirarlo en El Teflón Central. Te esperamos.",
    }));
    expect(saveStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "READY", notificationStatus: "SENT",
    }));
    expect(result.notificationStatus).toBe("SENT");
  });

  it("keeps the order ready when delivery fails and exposes retry", async () => {
    const saveStatus = vi.fn(async () => undefined);
    const result = await changeOrderOperationalStatus({
      globalTenantId: "tenant_1", orderId: "order_1", status: "READY",
    }, {
      loadOrder: vi.fn(async () => ({
        id: "order_1", orderNumber: "LABS-696730", operationalStatus: "PROCESSING",
        conversationId: "conversation_1", fulfillment: {},
      })),
      saveStatus,
      notifyReady: vi.fn(async () => { throw new Error("META_SEND_FAILED"); }),
    });
    expect(result).toMatchObject({ status: "READY", notificationStatus: "FAILED" });
    expect(saveStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "READY", notificationStatus: "FAILED", notificationError: "META_SEND_FAILED",
    }));
  });

  it("does not send the ready notification twice", async () => {
    const notifyReady = vi.fn();
    const result = await changeOrderOperationalStatus({
      globalTenantId: "tenant_1", orderId: "order_1", status: "READY",
    }, {
      loadOrder: vi.fn(async () => ({
        id: "order_1", orderNumber: "LABS-696730", operationalStatus: "READY",
        customerNotificationStatus: "SENT", conversationId: "conversation_1", fulfillment: {},
      })),
      saveStatus: vi.fn(),
      notifyReady,
    });
    expect(notifyReady).not.toHaveBeenCalled();
    expect(result.notificationStatus).toBe("SENT");
  });
});

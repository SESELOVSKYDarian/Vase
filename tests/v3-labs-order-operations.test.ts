import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { buildOrderStatusMessage, changeOrderOperationalStatus } from "../apps/vase-labs/app/lib/order-operations";

describe("Labs order operations", () => {
  it("builds shipment tracking copy and requires tracking", () => {
    expect(() => buildOrderStatusMessage({ status: "SHIPPED", orderNumber: "LABS-12" }))
      .toThrow("ORDER_TRACKING_REQUIRED");
    expect(buildOrderStatusMessage({ status: "SHIPPED", orderNumber: "LABS-12", carrier: "Correo", trackingUrl: "https://track.test/12" }))
      .toContain("https://track.test/12");
  });

  it("uses the operator-confirmed message", async () => {
    const notifyReady = vi.fn(async () => ({ ok: true as const }));
    await changeOrderOperationalStatus({ globalTenantId: "tenant_1", orderId: "order_1", status: "PREPARING", notificationText: "Estamos preparando tu pedido." }, {
      loadOrder: vi.fn(async () => ({ id: "order_1", orderNumber: "LABS-1", conversationId: "c1" })),
      saveStatus: vi.fn(async () => undefined), notifyReady,
    });
    expect(notifyReady).toHaveBeenCalledWith(expect.objectContaining({ text: "Estamos preparando tu pedido." }));
  });

  it("persists the delivery recipient and provider message id with the sent status event", async () => {
    const saveStatus = vi.fn(async () => undefined);
    await changeOrderOperationalStatus({ globalTenantId: "tenant_1", orderId: "order_1", status: "PREPARING", notificationText: "Preparando." }, {
      loadOrder: vi.fn(async () => ({ id: "order_1", orderNumber: "LABS-1", conversationId: "c1" })),
      saveStatus,
      notifyReady: vi.fn(async () => ({ ok: true as const, recipient: "+5491100000000", providerMessageId: "wamid.1" })),
    });
    expect(saveStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      notificationStatus: "SENT", recipient: "+5491100000000", providerMessageId: "wamid.1",
    }));
  });

  it("requires an editable preview before the orders UI sends a status", () => {
    const source = fs.readFileSync("apps/vase-labs/app/app/owner/labs/orders/orders-workspace.tsx", "utf8");
    expect(source).toContain("notificationPreview");
    expect(source).toContain("Confirmar cambio y enviar");
    expect(source).toContain("SHIPPED");
  });
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

  it("does not send a confirmed notification twice for the same operational status", async () => {
    const notifyReady = vi.fn();
    const result = await changeOrderOperationalStatus({
      globalTenantId: "tenant_1", orderId: "order_1", status: "PREPARING", notificationText: "Preparando.",
    }, {
      loadOrder: vi.fn(async () => ({ id: "order_1", orderNumber: "LABS-1", operationalStatus: "PREPARING", customerNotificationStatus: "SENT", conversationId: "conversation_1" })),
      saveStatus: vi.fn(), notifyReady,
    });
    expect(notifyReady).not.toHaveBeenCalled();
    expect(result.notificationStatus).toBe("SENT");
  });
});

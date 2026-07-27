import { publicOrderNumber } from "./local-order-snapshot";

export type OrderOperationalStatus = "PROCESSING" | "PREPARING" | "READY" | "CANCELLED";
type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "UNAVAILABLE";

type OperationalOrder = {
  id: string;
  orderNumber: string;
  operationalStatus?: string | null;
  customerNotificationStatus?: string | null;
  conversationId?: string | null;
  fulfillment?: { pickupLabel?: string | null; address?: string | null } | null;
};

type Dependencies = {
  loadOrder(input: { globalTenantId: string; orderId: string }): Promise<OperationalOrder | null>;
  saveStatus(input: {
    orderId: string;
    status: OrderOperationalStatus;
    notificationStatus?: NotificationStatus;
    notificationError?: string | null;
    now: Date;
  }): Promise<void>;
  notifyReady(input: { order: OperationalOrder; text: string }): Promise<{ ok: true }>;
};

function readyMessage(order: OperationalOrder) {
  const pickup = order.fulfillment?.pickupLabel?.trim() || order.fulfillment?.address?.trim();
  return `¡Tu pedido N.º ${publicOrderNumber(order.orderNumber)} ya está listo!${
    pickup ? ` Podés retirarlo en ${pickup}.` : ""
  } Te esperamos.`;
}

export async function changeOrderOperationalStatus(
  input: { globalTenantId: string; orderId: string; status: OrderOperationalStatus; retryNotification?: boolean },
  dependencies: Dependencies,
) {
  const order = await dependencies.loadOrder({ globalTenantId: input.globalTenantId, orderId: input.orderId });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (input.status === "READY" && order.customerNotificationStatus === "SENT") {
    return { status: "READY" as const, notificationStatus: "SENT" as const };
  }
  const now = new Date();
  await dependencies.saveStatus({ orderId: order.id, status: input.status, now });
  if (input.status !== "READY") return { status: input.status, notificationStatus: null };
  if (!order.conversationId) {
    await dependencies.saveStatus({ orderId: order.id, status: "READY", notificationStatus: "UNAVAILABLE", now });
    return { status: "READY" as const, notificationStatus: "UNAVAILABLE" as const };
  }
  try {
    await dependencies.notifyReady({ order, text: readyMessage(order) });
    await dependencies.saveStatus({ orderId: order.id, status: "READY", notificationStatus: "SENT", notificationError: null, now });
    return { status: "READY" as const, notificationStatus: "SENT" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHANNEL_DELIVERY_FAILED";
    await dependencies.saveStatus({ orderId: order.id, status: "READY", notificationStatus: "FAILED", notificationError: message, now });
    return { status: "READY" as const, notificationStatus: "FAILED" as const, notificationError: message };
  }
}

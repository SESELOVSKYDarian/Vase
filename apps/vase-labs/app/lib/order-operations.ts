import { publicOrderNumber } from "./local-order-snapshot";

export type OrderOperationalStatus = "PROCESSING" | "PREPARING" | "READY" | "SHIPPED" | "CANCELLED";
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
    notificationText?: string | null;
    recipient?: string | null;
    providerMessageId?: string | null;
    carrier?: string | null;
    trackingUrl?: string | null;
    now: Date;
  }): Promise<void>;
  notifyReady(input: { order: OperationalOrder; text: string }): Promise<{ ok: true; recipient?: string | null; providerMessageId?: string | null }>;
};

function readyMessage(order: OperationalOrder) {
  const pickup = order.fulfillment?.pickupLabel?.trim() || order.fulfillment?.address?.trim();
  return `¡Tu pedido N.º ${publicOrderNumber(order.orderNumber)} ya está listo!${
    pickup ? ` Podés retirarlo en ${pickup}.` : ""
  } Te esperamos.`;
}

export function buildOrderStatusMessage(input: {
  status: OrderOperationalStatus;
  orderNumber: string;
  pickupLabel?: string | null;
  address?: string | null;
  carrier?: string | null;
  trackingUrl?: string | null;
  trackingCode?: string | null;
}) {
  const number = publicOrderNumber(input.orderNumber);
  if (input.status === "SHIPPED") {
    const tracking = input.trackingUrl?.trim() || input.trackingCode?.trim();
    if (!input.carrier?.trim() || !tracking) throw new Error("ORDER_TRACKING_REQUIRED");
    return `Tu pedido N.º ${number} ya fue despachado por ${input.carrier.trim()}. Seguimiento: ${tracking}`;
  }
  if (input.status === "PREPARING") return `Estamos preparando tu pedido N.º ${number}.`;
  if (input.status === "CANCELLED") return `Tu pedido N.º ${number} fue cancelado.`;
  const pickup = input.pickupLabel?.trim() || input.address?.trim();
  return `¡Tu pedido N.º ${number} ya está listo!${pickup ? ` Podés retirarlo en ${pickup}.` : ""} Te esperamos.`;
}

export async function changeOrderOperationalStatus(
  input: { globalTenantId: string; orderId: string; status: OrderOperationalStatus; retryNotification?: boolean; notificationText?: string; carrier?: string; trackingUrl?: string },
  dependencies: Dependencies,
) {
  const order = await dependencies.loadOrder({ globalTenantId: input.globalTenantId, orderId: input.orderId });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.operationalStatus === input.status && order.customerNotificationStatus === "SENT") {
    return { status: input.status, notificationStatus: "SENT" as const };
  }
  const now = new Date();
  await dependencies.saveStatus({ orderId: order.id, status: input.status, notificationText: input.notificationText ?? null, carrier: input.carrier ?? null, trackingUrl: input.trackingUrl ?? null, now });
  const notificationText = input.notificationText?.trim()
    || (input.status === "READY" ? readyMessage(order) : "");
  if (!notificationText) return { status: input.status, notificationStatus: null };
  if (!order.conversationId) {
    await dependencies.saveStatus({ orderId: order.id, status: input.status, notificationStatus: "UNAVAILABLE", notificationText, carrier: input.carrier ?? null, trackingUrl: input.trackingUrl ?? null, now });
    return { status: input.status, notificationStatus: "UNAVAILABLE" as const };
  }
  try {
    const delivery = await dependencies.notifyReady({ order, text: notificationText });
    await dependencies.saveStatus({ orderId: order.id, status: input.status, notificationStatus: "SENT", notificationError: null, notificationText, recipient: delivery.recipient ?? null, providerMessageId: delivery.providerMessageId ?? null, carrier: input.carrier ?? null, trackingUrl: input.trackingUrl ?? null, now });
    return { status: input.status, notificationStatus: "SENT" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHANNEL_DELIVERY_FAILED";
    await dependencies.saveStatus({ orderId: order.id, status: input.status, notificationStatus: "FAILED", notificationError: message, notificationText, carrier: input.carrier ?? null, trackingUrl: input.trackingUrl ?? null, now });
    return { status: input.status, notificationStatus: "FAILED" as const, notificationError: message };
  }
}

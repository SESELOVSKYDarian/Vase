import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PanelKpis } from "@vase/ui/panel";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { enrichLocalOrderSnapshot } from "../../../../lib/local-order-snapshot";
import OrdersWorkspace from "./orders-workspace";

export const dynamic = "force-dynamic";

async function getOrdersData() {
  const requestHeaders = await headers();
  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const [orders, catalogProducts] = await Promise.all([
      labsPrisma.businessOrderProjection.findMany({
        where: { globalTenantId: resolved.context.globalTenantId },
        orderBy: { businessUpdatedAt: "desc" },
        take: 100,
        include: { statusEvents: { orderBy: { createdAt: "desc" }, take: 20 } },
      }),
      labsPrisma.catalogProduct.findMany({
        where: { globalTenantId: resolved.context.globalTenantId, active: true },
        select: { externalProductId: true, sku: true, name: true, price: true, imageUrl: true },
      }),
    ]);
    return { orders, catalogProducts };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Forders");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsOrdersPage() {
  const data = await getOrdersData();
  const displayOrders = data.orders.map((order) => {
    if (Number(order.totalAmount) > 0 || !Array.isArray(order.items)) return order;
    try {
      const enriched = enrichLocalOrderSnapshot(
        {
          items: JSON.parse(JSON.stringify(order.items)),
          currency: order.currency,
          shippingAmount: Number(order.shippingAmount),
        },
        data.catalogProducts,
      );
      return {
        ...order,
        items: enriched.items,
        subtotalAmount: enriched.subtotalAmount,
        shippingAmount: enriched.shippingAmount,
        totalAmount: enriched.totalAmount,
      };
    } catch {
      return order;
    }
  });
  const toPrepare = displayOrders.filter((order) => order.operationalStatus === "PROCESSING" || order.operationalStatus === "PREPARING").length;
  const sold = displayOrders.filter((order) => order.operationalStatus !== "CANCELLED").reduce((sum, order) => sum + Number(order.totalAmount), 0);

  return (
    <div className="vpa-stack" style={{ gap: 18 }}>
      <PanelKpis
        items={[
          { label: "Pedidos por chat", value: displayOrders.length, detail: "Los arma el asistente" },
          { label: "Por preparar", value: toPrepare, detail: toPrepare ? "Te están esperando" : "Nada pendiente", tone: toPrepare ? "dn" : "up" },
          { label: "Listos para entregar", value: displayOrders.filter((order) => order.operationalStatus === "READY").length, detail: "Retiro o envío" },
          { label: "Vendido", value: new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(sold), detail: "Sin cancelados" },
        ]}
      />
      <OrdersWorkspace
        orders={displayOrders.map((order) => {
          const raw = order.rawSnapshot as { fulfillment?: unknown } | null;
          return {
            id: order.id,
            orderNumber: order.orderNumber,
            sourceStatus: order.status,
            operationalStatus: order.operationalStatus,
            notificationStatus: order.customerNotificationStatus,
            notificationError: order.customerNotificationError,
            channel: order.channel,
            currency: order.currency,
            subtotalAmount: Number(order.subtotalAmount),
            shippingAmount: Number(order.shippingAmount),
            totalAmount: Number(order.totalAmount),
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            items: Array.isArray(order.items) ? JSON.parse(JSON.stringify(order.items)) : [],
            fulfillment: raw?.fulfillment && typeof raw.fulfillment === "object" ? (raw.fulfillment as { type?: string; pickupLabel?: string; address?: string }) : null,
            updatedAt: (order.operationalUpdatedAt ?? order.businessUpdatedAt).toISOString(),
            events: order.statusEvents.map((event) => ({
              id: event.id,
              toStatus: event.toStatus,
              notificationStatus: event.notificationStatus,
              createdAt: event.createdAt.toISOString(),
            })),
          };
        })}
      />
    </div>
  );
}

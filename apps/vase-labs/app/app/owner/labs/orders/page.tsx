import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsMetricCard } from "../labs-ui";
import OrdersWorkspace from "./orders-workspace";
import { ShoppingBag, Send, CreditCard } from "lucide-react";
import { buildLabsOrderAnalytics } from "../../../../lib/order-analytics";
import { enrichLocalOrderSnapshot } from "../../../../lib/local-order-snapshot";

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
    const confirmed = orders.filter((order) => ["CONFIRMED", "PAID", "FULFILLED"].includes(order.status)).length;
    return { orders, confirmed, catalogProducts };
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
      const enriched = enrichLocalOrderSnapshot({
        items: JSON.parse(JSON.stringify(order.items)),
        currency: order.currency,
        shippingAmount: Number(order.shippingAmount),
      }, data.catalogProducts);
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
  const total = displayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const analytics = buildLabsOrderAnalytics(data.orders);

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Pedidos"
        title="Pedidos de clientes"
        description="Pedidos creados por la IA en Labs o sincronizados desde Business, diferenciados por canal."
      />
      <section className="grid gap-3 md:grid-cols-3">
        <LabsMetricCard label="Pedidos en Labs" value={data.orders.length} icon={ShoppingBag} tone="info" />
        <LabsMetricCard label="Confirmados" value={data.confirmed} icon={Send} tone="success" />
        <LabsMetricCard label="Monto visible" value={new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(total)} icon={CreditCard} tone="neutral" />
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        {(["WHATSAPP", "INSTAGRAM", "MESSENGER"] as const).map((channel) => (
          <LabsMetricCard
            key={channel}
            label={channel}
            value={analytics.channels[channel].orders}
            detail={`${analytics.channels[channel].conversionRate}% conversion - ticket ${analytics.channels[channel].averageTicket}`}
            icon={ShoppingBag}
            tone="info"
          />
        ))}
      </section>
      <OrdersWorkspace orders={displayOrders.map((order) => {
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
          fulfillment: raw?.fulfillment && typeof raw.fulfillment === "object" ? raw.fulfillment : null,
          updatedAt: (order.operationalUpdatedAt ?? order.businessUpdatedAt).toISOString(),
          events: order.statusEvents.map((event) => ({
            id: event.id,
            toStatus: event.toStatus,
            notificationStatus: event.notificationStatus,
            createdAt: event.createdAt.toISOString(),
          })),
        };
      })} />
    </div>
  );
}

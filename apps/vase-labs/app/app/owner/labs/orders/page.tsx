import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsMetricCard } from "../labs-ui";
import OrdersWorkspace from "./orders-workspace";
import { ShoppingBag, Send, CreditCard } from "lucide-react";
import { buildLabsOrderAnalytics } from "../../../../lib/order-analytics";

export const dynamic = "force-dynamic";

async function getOrdersData() {
  const requestHeaders = await headers();
  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const orders = await labsPrisma.businessOrderProjection.findMany({
      where: { globalTenantId: resolved.context.globalTenantId },
      orderBy: { businessUpdatedAt: "desc" },
      take: 100,
    });
    const confirmed = orders.filter((order) => ["CONFIRMED", "PAID", "FULFILLED"].includes(order.status)).length;
    return { orders, confirmed };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Forders");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsOrdersPage() {
  const data = await getOrdersData();
  const total = data.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const analytics = buildLabsOrderAnalytics(data.orders);

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Pedidos"
        title="Pedidos de clientes"
        description="Pedidos creados por la IA o sincronizados desde Business, diferenciados por canal."
      />
      <section className="grid gap-3 md:grid-cols-3">
        <LabsMetricCard label="Pedidos sincronizados" value={data.orders.length} icon={ShoppingBag} tone="info" />
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
      <OrdersWorkspace orders={data.orders} />
    </div>
  );
}

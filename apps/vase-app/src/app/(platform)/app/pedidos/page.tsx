import { AppShell } from "@/components/layout/app-shell";
import { SharedOrdersBoard } from "@/components/panel/shared-orders";
import { loadSharedContext } from "@/lib/business/shared-context";
import { getSharedOrders } from "@/server/services/business-shared";

/** Pedidos compartidos: todo lo que te compraron, por la tienda o por chat, y se maneja desde acá. */
export default async function PedidosPage() {
  const { membership, session, dashboard, hasBusiness } = await loadSharedContext();
  const orders = hasBusiness ? await getSharedOrders(membership.tenantId) : null;
  const items = orders?.items ?? [];
  const byWhatsapp = items.filter((item) => item.whatsapp).length;

  return (
    <AppShell
      title="Pedidos"
      subtitle="Todo lo que te compraron, en un solo lugar"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      {!hasBusiness ? (
        <div className="vpa-empty">Los pedidos aparecen acá cuando tengas una tienda en Vase.</div>
      ) : orders === null ? (
        <div className="vpa-empty">No pudimos traer tus pedidos. Probá de nuevo en un rato.</div>
      ) : (
        <div className="vpa-stack" style={{ gap: 16 }}>
          <div className="vpa-kpis">
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Para atender</small>
                <b>{orders.open.toLocaleString("es-AR")}</b>
                <em>nuevos, por cobrar o preparando</em>
              </span>
            </div>
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Pedidos en total</small>
                <b>{orders.total.toLocaleString("es-AR")}</b>
                <em>desde que abriste la tienda</em>
              </span>
            </div>
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Por WhatsApp</small>
                <b>{byWhatsapp.toLocaleString("es-AR")}</b>
                <em>de los últimos {items.length.toLocaleString("es-AR")}</em>
              </span>
            </div>
          </div>

          <section className="vpa-card" style={{ padding: "12px 20px" }}>
            <SharedOrdersBoard orders={items} />
          </section>
          {items.length > 0 ? <p className="vpa-note">Tocá un pedido para ver el detalle y cambiar su estado.</p> : null}
        </div>
      )}
    </AppShell>
  );
}

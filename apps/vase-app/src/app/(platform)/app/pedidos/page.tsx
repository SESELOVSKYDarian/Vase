import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { formatShortDate, loadSharedContext } from "@/lib/business/shared-context";
import { resolveLabsHomeHref } from "@/lib/navigation/document-navigation";
import { getSharedOrders } from "@/server/services/business-shared";

// Cómo se ve cada estado del pedido (los mismos que en Business).
const STATUS: Record<string, { label: string; tone: string }> = {
  submitted: { label: "Nuevo", tone: "b" },
  pending_payment: { label: "Esperando el pago", tone: "y" },
  unpaid: { label: "Sin pagar", tone: "y" },
  paid: { label: "Pagado", tone: "g" },
  processing: { label: "Preparando", tone: "p" },
  cancelled: { label: "Cancelado", tone: "" },
  draft: { label: "Borrador", tone: "" },
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$ ${value.toLocaleString("es-AR")}`;
  }
}

/** Pedidos compartidos: todo lo que te compraron, en un solo lugar. */
export default async function PedidosPage() {
  const { membership, session, dashboard, hasBusiness, hasLabs } = await loadSharedContext();
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
        <div className="vpa-empty">Los pedidos de tu tienda aparecen acá cuando tengas Vase Business.</div>
      ) : orders === null ? (
        <div className="vpa-empty">No pudimos traer tus pedidos de Vase Business. Probá de nuevo en un rato.</div>
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

          <div className="vpa-filt" style={{ justifyContent: "flex-end" }}>
            {hasLabs ? (
              <a href={new URL("/owner/orders", resolveLabsHomeHref()).toString()} className="vpa-btn line">
                Pedidos por chat en Labs
              </a>
            ) : null}
            <Link href={"/app/business" as Route} className="vpa-btn acc">
              Gestionar en Business
            </Link>
          </div>

          <section className="vpa-card" style={{ padding: "12px 20px" }}>
            {items.length === 0 ? (
              <div className="vpa-empty" style={{ margin: "8px 0" }}>Todavía no te llegaron pedidos.</div>
            ) : (
              <div className="vpa-tw">
                <table className="vpa-tbl">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th className="r">Unidades</th>
                      <th className="r">Total</th>
                      <th>Por</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const status = STATUS[item.status] ?? { label: item.status, tone: "" };
                      return (
                        <tr key={item.id}>
                          <td className="vpa-mut">{formatShortDate(item.createdAt) ?? "—"}</td>
                          <td>
                            <b>{item.customerName ?? "Sin nombre"}</b>
                          </td>
                          <td className="r">{item.units.toLocaleString("es-AR")}</td>
                          <td className="r">{money(item.total, item.currency)}</td>
                          <td className="vpa-mut">{item.whatsapp ? "WhatsApp" : "Tienda"}</td>
                          <td>
                            <span className={`vpa-tag ${status.tone}`}>
                              <i />
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

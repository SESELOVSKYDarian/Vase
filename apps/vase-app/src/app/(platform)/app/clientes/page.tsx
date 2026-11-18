import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SharedCustomerActions } from "@/components/panel/shared-customer-actions";
import { formatShortDate, loadSharedContext } from "@/lib/business/shared-context";
import { getSharedCustomers } from "@/server/services/business-shared";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Clientes compartidos: quienes compraron o se registraron, los mismos para todos tus productos. */
export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const query = await searchParams;
  const search = one(query.q).trim().slice(0, 80);
  const { membership, session, dashboard, hasBusiness } = await loadSharedContext();
  const customers = hasBusiness ? await getSharedCustomers(membership.tenantId, search) : null;
  const items = customers?.items ?? [];
  const pending = items.filter((item) => item.pending).length;
  const buyers = items.filter((item) => item.orders > 0).length;

  return (
    <AppShell
      title="Clientes"
      subtitle="Quienes te compraron o se registraron en tu tienda"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      {!hasBusiness ? (
        <div className="vpa-empty">Tus clientes aparecen acá cuando tengas una tienda en Vase.</div>
      ) : customers === null ? (
        <div className="vpa-empty">No pudimos traer tus clientes. Probá de nuevo en un rato.</div>
      ) : (
        <div className="vpa-stack" style={{ gap: 16 }}>
          <div className="vpa-kpis">
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Clientes</small>
                <b>{customers.total.toLocaleString("es-AR")}</b>
                <em>registrados en tu tienda</em>
              </span>
            </div>
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Ya te compraron</small>
                <b>{buyers.toLocaleString("es-AR")}</b>
                <em>de los que ves acá</em>
              </span>
            </div>
            <div className="vpa-kpi">
              <span className="vpa-kt">
                <small>Esperan tu aprobación</small>
                <b>{pending.toLocaleString("es-AR")}</b>
                <em>{pending > 0 ? "aprobalos desde la lista" : "ninguno"}</em>
              </span>
            </div>
          </div>

          <div className="vpa-filt">
            <form className="vpa-search" action="/app/clientes" role="search">
              <Search size={16} aria-hidden="true" />
              <input className="vpa-inp" type="search" name="q" defaultValue={search} placeholder="Buscar por nombre, correo o teléfono" aria-label="Buscar clientes" />
            </form>
          </div>

          <section className="vpa-card" style={{ padding: "12px 20px" }}>
            {items.length === 0 ? (
              <div className="vpa-empty" style={{ margin: "8px 0" }}>
                {search ? `No encontramos clientes con “${search}”.` : "Todavía no tenés clientes registrados."}
              </div>
            ) : (
              <div className="vpa-tw">
                <table className="vpa-tbl">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Contacto</th>
                      <th>Ciudad</th>
                      <th className="r">Pedidos</th>
                      <th>Último pedido</th>
                      <th>Tipo</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <b>{item.name ?? item.email ?? "Sin nombre"}</b>
                          <span className="sub">Desde {formatShortDate(item.createdAt) ?? "—"}</span>
                        </td>
                        <td className="vpa-mut">
                          {item.email ?? "—"}
                          {item.phone ? <span className="sub">{item.phone}</span> : null}
                        </td>
                        <td className="vpa-mut">{item.city ?? "—"}</td>
                        <td className="r">{item.orders.toLocaleString("es-AR")}</td>
                        <td className="vpa-mut">{formatShortDate(item.lastOrderAt) ?? "—"}</td>
                        <td>
                          {item.pending ? (
                            <span className="vpa-tag y">
                              <i />
                              Por aprobar
                            </span>
                          ) : (
                            <span className={item.wholesale ? "vpa-tag p" : "vpa-tag"}>
                              <i />
                              {item.wholesale ? "Mayorista" : "Minorista"}
                            </span>
                          )}
                        </td>
                        <td className="r">
                          <SharedCustomerActions userId={item.id} pending={item.pending} wholesale={item.wholesale} />
                        </td>
                      </tr>
                    ))}
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

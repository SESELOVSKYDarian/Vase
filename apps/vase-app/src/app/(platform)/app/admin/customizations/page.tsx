import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminClientChangeForm } from "@/components/admin/admin-client-change-form";
import { KanbanBoard, type KanbanColumn } from "@/components/admin/kanban-board";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import {
  formatMoneyFromCents,
  getQuoteStatusLabel,
  getQuoteStatusTone,
} from "@/lib/business/custom-quotes";
import { getAdminCustomizationQuoteWorkspace } from "@/server/queries/custom-quotes";

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

const QUOTE_TONE: Record<string, string> = { success: "g", warning: "y", danger: "r", premium: "p", info: "b", neutral: "" };

export default async function AdminCustomizationsPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const workspace = await getAdminCustomizationQuoteWorkspace();

  const { metrics } = workspace;

  const stageOf = (request: (typeof workspace.requests)[number]) => {
    const status = request.quote?.status;
    if (!status || status === "DRAFT") return "nuevo";
    if (status === "PENDING_CLIENT") return "esperando";
    if (status === "ACCEPTED") return "aceptado";
    return "cerrado";
  };
  const columns: KanbanColumn[] = [
    { id: "nuevo", label: "Sin presupuesto" },
    { id: "esperando", label: "Esperando al cliente" },
    { id: "aceptado", label: "Aceptados" },
    { id: "cerrado", label: "Rechazados o vencidos" },
  ].map((column) => ({
    ...column,
    cards: workspace.requests
      .filter((request) => stageOf(request) === column.id)
      .map((request) => ({
        id: request.id,
        title: request.pageScope,
        sub: request.tenant.accountName,
        meta: request.quote ? `${getQuoteStatusLabel(request.quote.status)} · ${formatMoneyFromCents(request.quote.totalAmountCents, request.quote.currency)}` : "Sin presupuesto",
        tone: request.quote ? (QUOTE_TONE[getQuoteStatusTone(request.quote.status)] ?? "") : "y",
        href: `/customizations/${request.id}`,
      })),
  }));


  return (
    <AppShell title="Pedidos" subtitle="Trabajos a medida que piden los clientes y en qué quedó cada uno" tenantLabel="Admin">
      <section className="vpa-kpis" aria-label="Resumen">
        <div className="vpa-kpi"><span className="vpa-kt"><small>Pedidos</small><b>{metrics.totalRequests}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Sin presupuesto</small><b>{metrics.withoutQuote}</b><em>Hay que cotizarlos</em></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Esperando al cliente</small><b>{metrics.pendingClient}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Aceptados</small><b>{metrics.accepted}</b><em>Listos para hacer</em></span></div>
      </section>

      <KanbanBoard columns={columns} emptyLabel="Sin pedidos" />

      <details className="vpa-card" style={{ padding: 0 }}>
        <summary style={{ padding: "16px 20px", cursor: "pointer", listStyle: "none" }}>
          <b>Cargar un cambio pedido por un cliente</b>
        </summary>
        <div style={{ padding: "0 20px 20px" }}>
          <AdminClientChangeForm tenants={workspace.tenants} />
        </div>
      </details>

      {workspace.recentRevisions.length > 0 ? (
        <details className="vpa-card" style={{ padding: 0 }}>
          <summary style={{ padding: "16px 20px", cursor: "pointer", listStyle: "none" }}>
            <b>Últimos cambios en presupuestos</b>
          </summary>
          <div style={{ padding: "0 20px 16px" }}>
            <div className="vpa-tw">
              <table className="vpa-tbl">
                <tbody>
                  {workspace.recentRevisions.map((revision) => (
                    <tr key={revision.id}>
                      <td className="wrap">
                        <b>{revision.summary}</b>
                        <span className="sub">
                          {revision.quote.customPageRequest.tenant.accountName} · {revision.changedByUser?.email ?? "Sistema"}
                        </span>
                      </td>
                      <td className="r vpa-mut">{formatDate(revision.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ) : null}
    </AppShell>
  );
}

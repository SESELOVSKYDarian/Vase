import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ClientSupportTicketForm } from "@/components/support/client-support-ticket-form";
import { OpenSupportChatButton } from "@/components/support/open-support-chat-button";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getSupportStatusLabel } from "@/lib/support/tickets";
import { getTenantSupportOverview, getTenantSupportWidgetContext } from "@/server/queries/support";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

const GUIDES = [
  "Cómo funciona mi plan",
  "Cómo pago y descargo facturas",
  "Primeros pasos con Vase Business",
];

export default async function HelpPage() {
  let membership;
  let session;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.MEMBER));
  } catch {
    forbidden();
  }

  const [dashboard, supportOverview, supportWidget] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    getTenantSupportOverview(membership.tenantId),
    getTenantSupportWidgetContext(membership.tenantId),
  ]);

  if (!dashboard) forbidden();

  const canAsk = membership.role !== "MEMBER";

  return (
    <AppShell
      title="Ayuda y soporte"
      subtitle="Guías, videos y el equipo de Vase"
      tenantLabel={membership.tenant.name}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      <div className="vpa-g2">
        <div className="vpa-gs">
          {canAsk ? (
          <>
          <section className="vpa-card" aria-label="Nueva consulta">
            <div className="vpa-sech">
              <div>
                <h3>Nueva consulta</h3>
                <p>Contanos qué pasa y te responde alguien del equipo.</p>
              </div>
            </div>
            <ClientSupportTicketForm conversationOptions={supportWidget.conversationOptions} />
          </section>
          <section className="vpa-card" aria-label="Mis consultas">
            <div className="vpa-sech">
              <div>
                <h3>Mis consultas</h3>
                <p>Lo que le preguntaste al equipo de Vase.</p>
              </div>
            </div>
            {supportOverview.tickets.length === 0 ? (
              <div className="vpa-empty">Todavía no hiciste consultas.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {supportOverview.tickets.map((ticket) => (
                  <div className="vpa-hrow" key={ticket.id}>
                    <div className="vpa-g1">
                      <b>{ticket.subject}</b>
                      {ticket.aiSummary ? <span>{ticket.aiSummary}</span> : null}
                    </div>
                    <span className="vpa-tag">
                      <i />
                      {getSupportStatusLabel(ticket.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
          </>
          ) : (
            <section className="vpa-card">
              <h3>Consultas</h3>
              <p>Las consultas a Vase las hace el Dueño o un Encargado de tu cuenta.</p>
            </section>
          )}
        </div>
        <div className="vpa-gs">
          <section className="vpa-card" aria-label="Guías">
            <h3>Guías y videos</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {GUIDES.map((guide) => (
                <a className="vpa-guide" key={guide} href="https://help.vase.ar" target="_blank" rel="noreferrer">
                  {guide}
                </a>
              ))}
            </div>
            <a className="vpa-btn ink wide" style={{ marginTop: 12 }} href="https://help.vase.ar" target="_blank" rel="noreferrer">
              Abrir el manual completo
            </a>
          </section>
          {membership.role === "OWNER" ? (
          <section className="vpa-card" aria-label="Hablar con Vase">
            <h3>¿Es urgente?</h3>
            <p>Escribinos por el chat.</p>
            <div style={{ marginTop: 12 }}>
              <OpenSupportChatButton className="vpa-btn soft wide" />
            </div>
          </section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

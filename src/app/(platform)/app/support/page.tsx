import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/business/status-badge";
import { SupportReplyTemplateForm } from "@/components/support/support-reply-template-form";
import { SupportTicketNoteForm } from "@/components/support/support-ticket-note-form";
import { SupportTicketResponseForm } from "@/components/support/support-ticket-response-form";
import { SupportTicketTriageForm } from "@/components/support/support-ticket-triage-form";
import { PanelCard } from "@/components/ui/panel-card";
import {
  formatWaitingTime,
  getSupportPriorityLabel,
  getSupportPriorityTone,
  getSupportStatusLabel,
  getSupportTicketTone,
} from "@/lib/support/tickets";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getSupportQueueDashboard } from "@/server/queries/support";

export default async function SupportPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);
  } catch {
    forbidden();
  }

  const dashboard = await getSupportQueueDashboard();
  type SupportTicketItem = (typeof dashboard.tickets)[number];
  type SupportAgentItem = (typeof dashboard.agents)[number];
  type SupportTemplateItem = (typeof dashboard.templates)[number];
  type SupportNotificationItem = (typeof dashboard.notifications)[number];

  return (
    <AppShell
      title="Support Workspace"
      subtitle="Cola humana para tickets derivados desde IA o creados manualmente, con trazabilidad, notas internas, respuestas y asignación clara."
      tenantLabel="Cobertura multi-tenant"
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <PanelCard title="Tickets visibles" description="Carga total actual de soporte.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.summary.total}
          </p>
        </PanelCard>
        <PanelCard title="En cola" description="Aun no tomados por un agente.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.summary.queued}
          </p>
        </PanelCard>
        <PanelCard title="Asignados" description="Ya con responsable activo.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.summary.assigned}
          </p>
        </PanelCard>
        <PanelCard title="Demorados" description="Superan la espera estimada.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.summary.overdue}
          </p>
        </PanelCard>
        <PanelCard title="Alertas" description="Notificaciones recientes sin leer.">
          <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {dashboard.summary.unreadNotifications}
          </p>
        </PanelCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <PanelCard
          eyebrow="Cola de tickets"
          title="Toma, asignación y seguimiento"
          description="Cada ticket conserva su historial, contexto de IA, tiempos de espera y acciones del equipo."
        >
          <div className="grid gap-5">
            {dashboard.tickets.length === 0 ? (
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                No hay tickets en este momento.
              </div>
            ) : (
              dashboard.tickets.map((ticket: SupportTicketItem) => (
                <div key={ticket.id} className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/75 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold tracking-[0.22em] text-[var(--muted-soft)] uppercase">
                        {ticket.tenant.accountName}
                      </p>
                      <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                        {ticket.subject}
                      </h2>
                      <p className="text-sm leading-7 text-[var(--muted)]">
                        Cliente: {ticket.customerName ?? "Sin nombre"}.
                        {" "}
                        Contacto: {ticket.customerContact ?? "No informado"}.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        tone={getSupportPriorityTone(ticket.priority)}
                        label={getSupportPriorityLabel(ticket.priority)}
                      />
                      <StatusBadge
                        tone={getSupportTicketTone(ticket.status)}
                        label={getSupportStatusLabel(ticket.status)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      En espera: {formatWaitingTime(ticket.waitingSince)}
                    </div>
                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      SLA visible: {ticket.estimatedWaitMinutes} min
                    </div>
                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      Asignado a: {ticket.assignedToUser?.name ?? "Cola general"}
                    </div>
                    <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      Origen: {ticket.source === "AI_ESCALATION" ? "IA" : "Manual"}
                    </div>
                  </div>

                  {ticket.aiSummary ? (
                    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">Contexto de IA:</span>{" "}
                      {ticket.aiSummary}
                    </div>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-3">
                    <SupportTicketTriageForm
                      ticketId={ticket.id}
                      currentPriority={ticket.priority}
                      currentStatus={ticket.status}
                      currentAssignmentMode={ticket.assignmentMode}
                      assignedToUserId={ticket.assignedToUserId}
                      resolutionSummary={ticket.resolutionSummary}
                      agents={dashboard.agents.map((agent: SupportAgentItem) => ({
                        id: agent.id,
                        name: agent.name,
                      }))}
                    />
                    <SupportTicketResponseForm
                      ticketId={ticket.id}
                      templates={dashboard.templates.map((template: SupportTemplateItem) => ({
                        id: template.id,
                        name: template.name,
                        body: template.body,
                      }))}
                    />
                    <SupportTicketNoteForm ticketId={ticket.id} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
                      <p className="font-semibold text-[var(--foreground)]">Historial</p>
                      <div className="mt-3 grid gap-3">
                        {ticket.events.length === 0 ? (
                          <p className="text-sm leading-6 text-[var(--muted)]">
                            Sin eventos registrados todavia.
                          </p>
                        ) : (
                          ticket.events.map((event: SupportTicketItem["events"][number]) => (
                            <div key={event.id} className="rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-3 text-sm leading-6 text-[var(--muted)]">
                              <p className="font-medium text-[var(--foreground)]">
                                {event.actorUser?.name ?? "Sistema"} · {event.eventType}
                              </p>
                              <p>{event.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
                      <p className="font-semibold text-[var(--foreground)]">Notas internas</p>
                      <div className="mt-3 grid gap-3">
                        {ticket.notes.length === 0 ? (
                          <p className="text-sm leading-6 text-[var(--muted)]">
                            Sin notas internas todavia.
                          </p>
                        ) : (
                          ticket.notes.map((note: SupportTicketItem["notes"][number]) => (
                            <div key={note.id} className="rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-3 text-sm leading-6 text-[var(--muted)]">
                              <p className="font-medium text-[var(--foreground)]">{note.authorUser.name}</p>
                              <p>{note.body}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PanelCard>

        <div className="grid gap-6">
          <PanelCard
            eyebrow="Reglas de asignación"
            title="Criterio operativo"
            description="La asignación automática elige al agente con menor carga activa. La manual permite forzar ownership cuando el caso lo requiere."
          >
            <div className="grid gap-3">
              {dashboard.agents.map((agent: SupportAgentItem) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between gap-4 rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4"
                >
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{agent.name}</p>
                    <p className="text-sm leading-6 text-[var(--muted)]">{agent.platformRole}</p>
                  </div>
                  <StatusBadge tone="info" label={`${agent.activeAssignments} activos`} />
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Respuestas predefinidas"
            title="Biblioteca de respuestas"
            description="Sirve para acelerar el primer contacto, pedidos de información y cierres recurrentes."
            actions={
              <Link href="/app/support/knowledge" className="text-sm font-semibold text-[var(--accent)]">
                Abrir base de conocimiento
              </Link>
            }
          >
            <SupportReplyTemplateForm />
            <div className="mt-4 grid gap-3">
              {dashboard.templates.map((template: SupportTemplateItem) => (
                <div key={template.id} className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">{template.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                    {template.category ?? "General"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{template.body}</p>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Notificaciones"
            title="Actividad reciente"
            description="Alertas generadas por nuevos tickets, asignaciones y cambios relevantes."
          >
            <div className="grid gap-3">
              {dashboard.notifications.length === 0 ? (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Aun no hay notificaciones de soporte.
                </div>
              ) : (
                dashboard.notifications.map((notification: SupportNotificationItem) => (
                  <div key={notification.id} className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{notification.title}</p>
                      <StatusBadge
                        tone={notification.readAt ? "neutral" : "warning"}
                        label={notification.readAt ? "Leida" : "Pendiente"}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{notification.message}</p>
                    <p className="mt-2 text-xs text-[var(--muted-soft)]">
                      {notification.recipientUser?.name ?? "Equipo"} · {notification.ticket.subject}
                    </p>
                  </div>
                ))
              )}
            </div>
          </PanelCard>
        </div>
      </section>
    </AppShell>
  );
}

import { StatusBadge } from "@/components/business/status-badge";
import { ClientSupportTicketForm } from "@/components/support/client-support-ticket-form";
import { PanelCard } from "@/components/ui/panel-card";
import {
  formatWaitingTime,
  getSupportPriorityLabel,
  getSupportPriorityTone,
  getSupportStatusLabel,
  getSupportTicketTone,
} from "@/lib/support/tickets";
import { getLabsOwnerActivityData } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsActivityPage() {
  const { dashboard, supportOverview, labsEnabled } = await getLabsOwnerActivityData();
  type TenantSupportTicket = (typeof supportOverview.tickets)[number];

  return (
    <div className="space-y-8">
      <header className="max-w-4xl">
        <h2 className="text-4xl tracking-[-0.04em] text-[#191c1b]">Actividad</h2>
        <p className="mt-3 text-lg text-[#4b5b52]">
          Revisa derivaciones, tickets humanos y trazabilidad de cada interaccion de soporte.
        </p>
      </header>

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <PanelCard
            eyebrow="Soporte humano"
            title="Derivacion de IA a una persona real"
            description="Si la IA detecta que hace falta intervencion humana, puedes crear o revisar tickets con tiempos de espera visibles."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                <p className="text-sm text-[var(--muted)]">Tickets totales</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{supportOverview.summary.total}</p>
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                <p className="text-sm text-[var(--muted)]">Activos</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{supportOverview.summary.active}</p>
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                <p className="text-sm text-[var(--muted)]">En cola</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{supportOverview.summary.queued}</p>
              </div>
            </div>

            <div className="mt-6">
              <ClientSupportTicketForm
                conversationOptions={dashboard.conversations.map((conversation) => ({
                  id: conversation.id,
                  label: `${conversation.customerName ?? "Cliente"} - ${conversation.channelType}`,
                }))}
              />
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Cola y trazabilidad"
            title="Estado visible de cada ticket"
            description="El negocio puede seguir prioridad, asignacion, tiempo de espera y cambios relevantes sin entrar a detalles tecnicos."
          >
            <div className="grid gap-3">
              {supportOverview.tickets.length === 0 ? (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Todavia no hay tickets humanos abiertos o historicos para este tenant.
                </div>
              ) : (
                supportOverview.tickets.map((ticket: TenantSupportTicket) => (
                  <div
                    key={ticket.id}
                    className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{ticket.subject}</p>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          tone={getSupportPriorityTone(ticket.priority)}
                          label={getSupportPriorityLabel(ticket.priority)}
                        />
                        <StatusBadge tone={getSupportTicketTone(ticket.status)} label={getSupportStatusLabel(ticket.status)} />
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Espera visible: {formatWaitingTime(ticket.waitingSince)}. Asignado a:{" "}
                      {ticket.assignedToUser?.name ?? "cola general"}.
                    </p>
                    <div className="mt-3 grid gap-2">
                      {ticket.events.map((event: TenantSupportTicket["events"][number]) => (
                        <div
                          key={event.id}
                          className="rounded-2xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-3 text-sm leading-6 text-[var(--muted)]"
                        >
                          <span className="font-medium text-[var(--foreground)]">{event.actorUser?.name ?? "Sistema"}:</span>{" "}
                          {event.message}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </PanelCard>
        </section>
      )}
    </div>
  );
}

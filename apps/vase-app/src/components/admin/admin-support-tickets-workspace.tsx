"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, History, MessageSquareText, Paperclip, ShieldCheck, UserRoundCheck } from "lucide-react";
import { SupportTicketAttachmentForm } from "@/components/support/support-ticket-attachment-form";
import { SupportTicketAssigneesForm } from "@/components/support/support-ticket-assignees-form";
import { SupportTicketCustomerTimeline } from "@/components/support/support-ticket-customer-timeline";
import { SupportTicketInternalHistory } from "@/components/support/support-ticket-internal-history";
import { SupportTicketMetricsStrip } from "@/components/support/support-ticket-metrics-strip";
import { SupportTicketNoteForm } from "@/components/support/support-ticket-note-form";
import { SupportTicketResponseForm } from "@/components/support/support-ticket-response-form";
import { SupportTicketSubtasksWorklogPanel } from "@/components/support/support-ticket-subtasks-worklog-panel";
import { SupportTicketSummaryCard } from "@/components/support/support-ticket-summary-card";
import { SupportTicketTakeForm } from "@/components/support/support-ticket-take-form";
import { SupportTicketTriageForm } from "@/components/support/support-ticket-triage-form";
import { ActionToast } from "@/components/ui/action-toast";
import { CrudModal } from "@/components/ui/crud-modal";

type TicketItem = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  source: string;
  assignmentMode: string;
  assignedToUserId: string | null;
  resolutionSummary: string | null;
  updatedAt: Date;
  tenant: { accountName: string };
  assignedToUser: { name: string } | null;
  assignees: Array<{ id: string; isPrimary: boolean; user: { id: string; name: string } }>;
  attachments: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number }>;
  notes: Array<{
    id: string;
    body: string;
    visibility: "INTERNAL" | "CUSTOMER";
    createdAt: string | Date;
    authorUser: { name: string; platformRole: string };
  }>;
  events: Array<{
    id: string;
    message: string;
    eventType: string;
    createdAt: string | Date;
    actorUser: { name: string; platformRole: string } | null;
  }>;
  subtasks: Array<{
    id: string;
    title: string;
    status: "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELED";
    assignedToUserId: string | null;
  }>;
  worklogs: Array<{ id: string; minutes: number; note: string | null; createdAt: string | Date; actorUser: { name: string } | null }>;
};

type Agent = { id: string; name: string };
type Template = { id: string; name: string; body: string };

function labelStatus(value: string) {
  return (
    {
      QUEUED: "Nuevo",
      ASSIGNED: "Asignado",
      WAITING_CUSTOMER: "Esperando cliente",
      WAITING_INTERNAL: "Esperando interno",
      RESOLVED: "Resuelto",
      RETURNED_TO_AI: "Volver a IA",
      CLOSED: "Cerrado",
    }[value] ?? value
  );
}

function labelAssignees(ticket: TicketItem) {
  const names = ticket.assignees.map((assignee) => assignee.user.name);
  if (names.length === 0) return ticket.assignedToUser?.name ?? "Sin asignar";
  return names.join(", ");
}

export function AdminSupportTicketsWorkspace({ tickets, agents, templates }: { tickets: TicketItem[]; agents: Agent[]; templates: Template[] }) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"operacion" | "historial" | "cliente">("operacion");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null, [selectedTicketId, tickets]);
  const inProgressCount = tickets.filter((ticket) => ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"].includes(ticket.status)).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Total: {tickets.length}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Activos: {inProgressCount}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Sin asignar: {tickets.filter((ticket) => !ticket.assignedToUserId).length}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Urgentes: {tickets.filter((ticket) => ticket.priority === "URGENT").length}</div>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Tickets ({tickets.length})</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="px-2 py-2">Ticket</th>
                <th className="px-2 py-2">Cliente</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2">Prioridad</th>
                <th className="px-2 py-2">Asignado</th>
                <th className="px-2 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-2 py-2">
                    <p className="font-medium text-[var(--foreground)]">{ticket.subject}</p>
                    <p className="text-xs text-[var(--muted)]">{ticket.source}</p>
                  </td>
                  <td className="px-2 py-2">{ticket.tenant.accountName}</td>
                  <td className="px-2 py-2">{labelStatus(ticket.status)}</td>
                  <td className="px-2 py-2">
                    <div className="grid gap-1">
                      <span>{ticket.priority}</span>
                      <SupportTicketMetricsStrip subtasks={ticket.subtasks} worklogs={ticket.worklogs} notesCount={ticket.notes.length} layout="inline" />
                    </div>
                  </td>
                  <td className="px-2 py-2">{labelAssignees(ticket)}</td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => setSelectedTicketId(ticket.id)} className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs font-semibold transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)]">
                      <Eye className="h-4 w-4" />
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-sm text-[var(--muted)]">
                    No hay tickets con los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <CrudModal
        open={Boolean(selectedTicket)}
        onClose={() => {
          setSelectedTicketId(null);
          setActiveTab("operacion");
        }}
        title={selectedTicket ? `Ticket: ${selectedTicket.subject}` : "Gestionar ticket"}
        description="Operaciones de soporte en un solo lugar."
        widthClassName="max-w-6xl"
      >
        {selectedTicket ? (
          <div className="grid gap-4">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3">
              <p className="text-xs text-[var(--muted)]">Vista del ticket</p>
              <div className="inline-flex rounded-xl border border-[var(--border-subtle)] p-1">
                <button type="button" onClick={() => setActiveTab("operacion")} className={`min-h-11 min-w-11 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)] ${activeTab === "operacion" ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]" : "text-[var(--foreground)]"}`}>
                  Operación
                </button>
                <button type="button" onClick={() => setActiveTab("historial")} className={`min-h-11 min-w-11 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)] ${activeTab === "historial" ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]" : "text-[var(--foreground)]"}`}>
                  Historial
                </button>
                <button type="button" onClick={() => setActiveTab("cliente")} className={`min-h-11 min-w-11 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)] ${activeTab === "cliente" ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]" : "text-[var(--foreground)]"}`}>
                  Vista cliente
                </button>
              </div>
            </section>

            <SupportTicketSummaryCard
              customerLabel={selectedTicket.tenant.accountName}
              statusLabel={labelStatus(selectedTicket.status)}
              priorityLabel={selectedTicket.priority}
              assigneeLabel={labelAssignees(selectedTicket)}
              subtasks={selectedTicket.subtasks}
              worklogs={selectedTicket.worklogs}
              notesCount={selectedTicket.notes.length}
            />

            {activeTab === "operacion" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <section className="grid gap-2">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><ShieldCheck className="h-4 w-4" /> Triage</p>
                  <SupportTicketTriageForm
                    ticketId={selectedTicket.id}
                    currentPriority={selectedTicket.priority}
                    currentStatus={selectedTicket.status}
                    currentAssignmentMode={selectedTicket.assignmentMode}
                    assignedToUserId={selectedTicket.assignedToUserId}
                    resolutionSummary={selectedTicket.resolutionSummary}
                    agents={agents}
                    onResult={setToast}
                  />
                </section>
                <section className="grid gap-2">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><UserRoundCheck className="h-4 w-4" /> Responsables</p>
                  <SupportTicketAssigneesForm
                    ticketId={selectedTicket.id}
                    agents={agents}
                    selectedAssigneeIds={selectedTicket.assignees.map((assignee) => assignee.user.id)}
                    primaryAssigneeId={selectedTicket.assignees.find((assignee) => assignee.isPrimary)?.user.id ?? selectedTicket.assignedToUserId}
                    onResult={setToast}
                  />
                </section>
                <section className="grid gap-2">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><MessageSquareText className="h-4 w-4" /> Respuesta al cliente</p>
                  <SupportTicketResponseForm ticketId={selectedTicket.id} templates={templates} onResult={setToast} />
                </section>
                <section className="grid gap-2">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><UserRoundCheck className="h-4 w-4" /> Notas</p>
                  <SupportTicketNoteForm ticketId={selectedTicket.id} onResult={setToast} />
                  {!selectedTicket.assignedToUserId ? <SupportTicketTakeForm ticketId={selectedTicket.id} onResult={setToast} /> : null}
                </section>
                <section className="grid gap-2">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><Paperclip className="h-4 w-4" /> Adjuntos</p>
                  <SupportTicketAttachmentForm ticketId={selectedTicket.id} onResult={setToast} />
                  {selectedTicket.attachments.length ? (
                    <div className="grid gap-2">
                      {selectedTicket.attachments.map((attachment) => (
                        <p key={attachment.id} className="rounded-xl bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--muted)]">
                          {attachment.fileName} | {attachment.mimeType} | {attachment.sizeBytes} bytes
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">Sin adjuntos recientes.</p>
                  )}
                </section>
              </div>
            ) : null}

            {activeTab === "historial" ? (
              <section className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <History className="h-4 w-4" /> Historial del ticket
                </p>
                <SupportTicketInternalHistory notes={selectedTicket.notes} events={selectedTicket.events} />
              </section>
            ) : null}

            <section className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs font-semibold text-[var(--foreground)]">Timeline visible cliente</p>
              {activeTab === "cliente" ? (
                <SupportTicketCustomerTimeline notes={selectedTicket.notes} events={selectedTicket.events} />
              ) : (
                <p className="text-xs text-[var(--muted)]">Abre la pestaña "Vista cliente" para revisar el timeline.</p>
              )}
            </section>

            {activeTab === "operacion" ? (
              <section className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
                <SupportTicketSubtasksWorklogPanel
                  ticketId={selectedTicket.id}
                  agents={agents}
                  subtasks={selectedTicket.subtasks}
                  worklogs={selectedTicket.worklogs}
                  onResult={setToast}
                />
              </section>
            ) : null}
          </div>
        ) : null}
      </CrudModal>

      <ActionToast toast={toast} />
    </div>
  );
}

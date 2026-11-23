"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, History, MessageSquareText, Paperclip, ShieldCheck, UserRoundCheck } from "lucide-react";
import { SupportTicketAttachmentForm } from "@/components/support/support-ticket-attachment-form";
import { SupportTicketAssigneesForm } from "@/components/support/support-ticket-assignees-form";
import { SupportTicketCustomerTimeline } from "@/components/support/support-ticket-customer-timeline";
import { SupportTicketInternalHistory } from "@/components/support/support-ticket-internal-history";
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

const OPEN = ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"];
const STATUS_TONE: Record<string, string> = {
  QUEUED: "b",
  ASSIGNED: "p",
  WAITING_CUSTOMER: "y",
  WAITING_INTERNAL: "y",
  RESOLVED: "g",
  CLOSED: "",
  RETURNED_TO_AI: "b",
};
const PRIORITY: Record<string, { label: string; tone: string }> = {
  LOW: { label: "Baja", tone: "" },
  NORMAL: { label: "Normal", tone: "b" },
  HIGH: { label: "Alta", tone: "y" },
  URGENT: { label: "Urgente", tone: "r" },
};

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
  const inProgressCount = tickets.filter((ticket) => OPEN.includes(ticket.status)).length;

  return (
    <div className="vpa-stack">
      <section className="vpa-kpis" aria-label="Resumen de tickets">
        <div className="vpa-kpi"><span className="vpa-kt"><small>Abiertos</small><b>{inProgressCount}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Sin asignar</small><b>{tickets.filter((ticket) => !ticket.assignedToUserId && OPEN.includes(ticket.status)).length}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Urgentes</small><b>{tickets.filter((ticket) => ticket.priority === "URGENT" && OPEN.includes(ticket.status)).length}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>En la lista</small><b>{tickets.length}</b></span></div>
      </section>

      <section className="vpa-card" style={{ padding: "12px 20px" }}>
        {tickets.length === 0 ? (
          <div className="vpa-empty" style={{ margin: "8px 0" }}>No hay tickets con este filtro.</div>
        ) : (
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Responsable</th>
                  <th>Actualizado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="wrap">
                      <button type="button" className="vpa-lnk" style={{ fontSize: 13.5, color: "var(--tx)", textAlign: "left" }} onClick={() => setSelectedTicketId(ticket.id)}>
                        {ticket.subject}
                      </button>
                      <span className="sub">
                        {ticket.tenant.accountName} · {ticket.source === "AI_ESCALATION" ? "Lo pasó la IA" : "Cargado a mano"}
                      </span>
                    </td>
                    <td>
                      <span className={`vpa-tag ${STATUS_TONE[ticket.status] ?? ""}`}>
                        <i />
                        {labelStatus(ticket.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`vpa-tag ${PRIORITY[ticket.priority]?.tone ?? ""}`}>
                        <i />
                        {PRIORITY[ticket.priority]?.label ?? ticket.priority}
                      </span>
                    </td>
                    <td className="vpa-mut">{labelAssignees(ticket)}</td>
                    <td className="vpa-mut">{new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(ticket.updatedAt))}</td>
                    <td className="r">
                      <button type="button" onClick={() => setSelectedTicketId(ticket.id)} className="vpa-btn line sm">
                        <Eye size={14} aria-hidden="true" />
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CrudModal
        open={Boolean(selectedTicket)}
        onClose={() => {
          setSelectedTicketId(null);
          setActiveTab("operacion");
        }}
        title={selectedTicket ? selectedTicket.subject : "Ticket"}
        description={selectedTicket ? `${selectedTicket.tenant.accountName} · ${labelStatus(selectedTicket.status)}` : undefined}
        widthClassName="max-w-6xl"
      >
        {selectedTicket ? (
          <div className="grid gap-4">
            <nav className="vpa-seg" aria-label="Partes del ticket">
              {([
                ["operacion", "Responder"],
                ["historial", "Historial"],
                ["cliente", "Lo que ve el cliente"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" className={activeTab === id ? "on" : undefined} aria-pressed={activeTab === id} onClick={() => setActiveTab(id)}>
                  {label}
                </button>
              ))}
            </nav>

            <SupportTicketSummaryCard
              customerLabel={selectedTicket.tenant.accountName}
              statusLabel={labelStatus(selectedTicket.status)}
              priorityLabel={PRIORITY[selectedTicket.priority]?.label ?? selectedTicket.priority}
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

            {activeTab === "cliente" ? (
              <section className="vpa-card stack">
                <SupportTicketCustomerTimeline notes={selectedTicket.notes} events={selectedTicket.events} />
              </section>
            ) : null}

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

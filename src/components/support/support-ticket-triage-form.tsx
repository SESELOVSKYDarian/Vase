"use client";

import { useActionState } from "react";
import {
  type SupportActionState,
  updateSupportTicketAction,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type SupportTicketTriageFormProps = {
  ticketId: string;
  currentPriority: string;
  currentStatus: string;
  currentAssignmentMode: string;
  assignedToUserId?: string | null;
  resolutionSummary?: string | null;
  agents: Array<{
    id: string;
    name: string;
  }>;
};

export function SupportTicketTriageForm({
  ticketId,
  currentPriority,
  currentStatus,
  currentAssignmentMode,
  assignedToUserId,
  resolutionSummary,
  agents,
}: SupportTicketTriageFormProps) {
  const [state, formAction] = useActionState(updateSupportTicketAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="ticketId" value={ticketId} />

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Prioridad</span>
          <select
            name="priority"
            defaultValue={currentPriority}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="LOW">Baja</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Estado</span>
          <select
            name="status"
            defaultValue={currentStatus}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="QUEUED">En cola</option>
            <option value="ASSIGNED">Asignado</option>
            <option value="WAITING_CUSTOMER">Esperando cliente</option>
            <option value="WAITING_INTERNAL">Esperando interno</option>
            <option value="RESOLVED">Resuelto</option>
            <option value="RETURNED_TO_AI">Volver a IA</option>
            <option value="CLOSED">Cerrado</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Asignacion</span>
          <select
            name="assignmentMode"
            defaultValue={currentAssignmentMode}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="AUTOMATIC">Automatica</option>
            <option value="MANUAL">Manual</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Asignar a</span>
        <select
          name="assignedToUserId"
          defaultValue={assignedToUserId ?? ""}
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        >
          <option value="">Mantener en cola o dejar que la regla automatica elija</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Resumen de resolucion o handoff</span>
        <textarea
          name="resolutionSummary"
          defaultValue={resolutionSummary ?? ""}
          rows={3}
          className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar ticket
      </button>

      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

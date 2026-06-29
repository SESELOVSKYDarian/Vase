"use client";

import { useActionState, useEffect } from "react";
import {
  type SupportActionState,
  updateSupportTicketAssigneesAction,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type Agent = { id: string; name: string };

export function SupportTicketAssigneesForm({
  ticketId,
  agents,
  selectedAssigneeIds,
  primaryAssigneeId,
  onResult,
}: {
  ticketId: string;
  agents: Agent[];
  selectedAssigneeIds: string[];
  primaryAssigneeId?: string | null;
  onResult?: (result: { tone: "success" | "error"; message: string }) => void;
}) {
  const [state, formAction] = useActionState(updateSupportTicketAssigneesAction, initialState);

  useEffect(() => {
    if (!onResult) return;
    if (state.success) onResult({ tone: "success", message: state.success });
    if (state.error) onResult({ tone: "error", message: state.error });
  }, [onResult, state.error, state.success]);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid gap-2">
        <p className="text-sm font-medium text-[var(--foreground)]">Equipo asignado</p>
        <div className="grid gap-2 md:grid-cols-2">
          {agents.map((agent) => (
            <label
              key={agent.id}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-sm"
            >
              <input
                type="checkbox"
                name="assigneeIds"
                value={agent.id}
                defaultChecked={selectedAssigneeIds.includes(agent.id)}
                className="h-4 w-4"
              />
              <span>{agent.name}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Responsable principal</span>
        <select
          name="primaryAssigneeId"
          defaultValue={primaryAssigneeId ?? ""}
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        >
          <option value="">Sin responsable principal</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar responsables
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import {
  addSupportNoteAction,
  type SupportActionState,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type SupportTicketNoteFormProps = {
  ticketId: string;
  onResult?: (result: { tone: "success" | "error"; message: string }) => void;
};

export function SupportTicketNoteForm({ ticketId, onResult }: SupportTicketNoteFormProps) {
  const [state, formAction] = useActionState(addSupportNoteAction, initialState);

  useEffect(() => {
    if (!onResult) return;
    if (state.success) onResult({ tone: "success", message: state.success });
    if (state.error) onResult({ tone: "error", message: state.error });
  }, [onResult, state.error, state.success]);

  return (
    <form action={formAction} className="grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Nota interna</span>
        <textarea
          name="body"
          rows={3}
          className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          placeholder="Deja contexto para el siguiente agente o para auditoria."
        />
      </label>
      <label className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-3 text-xs text-[var(--muted)]">
        <input type="checkbox" name="visibility" value="CUSTOMER" className="h-4 w-4" />
        Visible para cliente
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar nota
      </button>

      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  addSupportNoteAction,
  type SupportActionState,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type SupportTicketNoteFormProps = {
  ticketId: string;
};

export function SupportTicketNoteForm({ ticketId }: SupportTicketNoteFormProps) {
  const [state, formAction] = useActionState(addSupportNoteAction, initialState);

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

"use client";

import { useActionState } from "react";
import {
  createClientSupportTicketAction,
  type ClientSupportActionState,
} from "@/app/(platform)/app/owner/labs/support-actions";

const initialState: ClientSupportActionState = {};

type ClientSupportTicketFormProps = {
  conversationOptions: Array<{
    id: string;
    label: string;
  }>;
};

export function ClientSupportTicketForm({ conversationOptions }: ClientSupportTicketFormProps) {
  const [state, formAction] = useActionState(createClientSupportTicketAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Asunto</span>
        <input
          name="subject"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          placeholder="Necesito que una persona revise una conversacion"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Prioridad</span>
          <select
            name="priority"
            defaultValue="NORMAL"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="LOW">Baja</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Conversacion relacionada</span>
          <select
            name="conversationId"
            defaultValue=""
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="">Sin conversacion especifica</option>
            {conversationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Contexto para soporte</span>
        <textarea
          name="summary"
          rows={4}
          className="min-h-28 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          placeholder="Explica que detecto la IA, por que necesitas a una persona y que esperas que resuelva el equipo."
        />
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Crear ticket humano
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

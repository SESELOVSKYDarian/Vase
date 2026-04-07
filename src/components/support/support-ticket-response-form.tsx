"use client";

import { useActionState } from "react";
import {
  sendSupportReplyAction,
  type SupportActionState,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type SupportTicketResponseFormProps = {
  ticketId: string;
  templates: Array<{
    id: string;
    name: string;
    body: string;
  }>;
};

export function SupportTicketResponseForm({
  ticketId,
  templates,
}: SupportTicketResponseFormProps) {
  const [state, formAction] = useActionState(sendSupportReplyAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="ticketId" value={ticketId} />

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Respuesta predefinida</span>
        <select
          name="templateId"
          defaultValue=""
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        >
          <option value="">Escribir respuesta personalizada</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Mensaje para el cliente</span>
        <textarea
          name="body"
          rows={4}
          className="min-h-28 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          placeholder="Si eliges una respuesta predefinida, puedes dejar este campo vacio."
        />
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Registrar respuesta
      </button>

      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

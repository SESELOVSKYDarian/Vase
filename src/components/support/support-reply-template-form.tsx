"use client";

import { useActionState } from "react";
import {
  createSupportReplyTemplateAction,
  type SupportActionState,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

export function SupportReplyTemplateForm() {
  const [state, formAction] = useActionState(createSupportReplyTemplateAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Nombre</span>
        <input
          name="name"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          placeholder="Confirmacion de recepcion"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Categoria</span>
        <input
          name="category"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          placeholder="Primer contacto"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Cuerpo</span>
        <textarea
          name="body"
          rows={4}
          className="min-h-28 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          placeholder="Hola, ya recibimos tu caso y un agente lo esta revisando."
        />
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Crear respuesta
      </button>

      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { createLabsUrlAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

export function KnowledgeUrlForm() {
  const [state, formAction] = useActionState(createLabsUrlAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Titulo de referencia</span>
        <input
          name="title"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">URL del sitio</span>
        <input
          name="sourceUrl"
          type="url"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Paths permitidos</span>
        <input
          name="allowedPaths"
          placeholder="/faq,/envios,/cambios"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Agregar URL
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

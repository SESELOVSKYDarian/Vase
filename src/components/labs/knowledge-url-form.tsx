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
          className="labs-input"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">URL del sitio</span>
        <input
          name="sourceUrl"
          type="url"
          className="labs-input"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Paths permitidos</span>
        <input
          name="allowedPaths"
          placeholder="/faq,/envios,/cambios"
          className="labs-input"
        />
      </label>
      <button
        type="submit"
        className="labs-button labs-button-primary"
      >
        Agregar URL
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

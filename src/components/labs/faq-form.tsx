"use client";

import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { createLabsFaqAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

export function FaqForm() {
  const [state, formAction] = useActionState(createLabsFaqAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Pregunta frecuente</span>
        <input
          name="question"
          className="labs-input"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Respuesta</span>
        <textarea
          name="answer"
          rows={4}
          className="labs-textarea min-h-28"
        />
      </label>
      <button
        type="submit"
        className="labs-button labs-button-primary"
      >
        Agregar FAQ
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

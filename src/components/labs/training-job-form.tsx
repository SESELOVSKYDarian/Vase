"use client";

import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { queueLabsTrainingAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

export function TrainingJobForm() {
  const [state, formAction] = useActionState(queueLabsTrainingAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Resumen del entrenamiento</span>
        <input
          name="summary"
          placeholder="Actualizar FAQ, archivos y URL institucional"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Iniciar entrenamiento
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

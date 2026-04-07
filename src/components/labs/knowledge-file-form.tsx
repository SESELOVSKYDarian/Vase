"use client";

import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { uploadLabsKnowledgeFileAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

export function KnowledgeFileForm() {
  const [state, formAction] = useActionState(uploadLabsKnowledgeFileAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Archivo de la empresa</span>
        <input
          name="file"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Subir archivo
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import type { SupportActionState } from "@/app/(platform)/app/support/actions";
import { deleteSupportKnowledgeAction } from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type SupportKnowledgeDeleteFormProps = {
  knowledgeId: string;
  disabled?: boolean;
};

export function SupportKnowledgeDeleteForm({
  knowledgeId,
  disabled = false,
}: SupportKnowledgeDeleteFormProps) {
  const [state, formAction] = useActionState(deleteSupportKnowledgeAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="knowledgeId" value={knowledgeId} />
      <button
        type="submit"
        disabled={disabled}
        className="min-h-10 rounded-full border border-[var(--danger)] px-4 text-xs font-semibold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Eliminar
      </button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

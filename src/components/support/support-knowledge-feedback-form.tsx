"use client";

import { useActionState } from "react";
import type { SupportActionState } from "@/app/(platform)/app/support/actions";
import { recordSupportAiFeedbackAction } from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type SupportKnowledgeFeedbackFormProps = {
  responseLogId: string;
};

export function SupportKnowledgeFeedbackForm({
  responseLogId,
}: SupportKnowledgeFeedbackFormProps) {
  const [state, formAction] = useActionState(recordSupportAiFeedbackAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-4">
      <input type="hidden" name="responseLogId" value={responseLogId} />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="helpful"
          value="true"
          className="min-h-10 rounded-full border border-[var(--success)] px-4 text-sm font-semibold text-[var(--success)]"
        >
          Fue util
        </button>
        <button
          type="submit"
          name="helpful"
          value="false"
          className="min-h-10 rounded-full border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)]"
        >
          No fue util
        </button>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Nota opcional</span>
        <textarea
          name="feedbackNote"
          rows={3}
          placeholder="Que falto, que sobraba o que FAQ convendria agregar"
          className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

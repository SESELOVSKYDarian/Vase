"use client";

import { useActionState } from "react";
import type { SupportActionState } from "@/app/(platform)/app/support/actions";
import { previewSupportKnowledgeReplyAction } from "@/app/(platform)/app/support/actions";
import { SupportKnowledgeFeedbackForm } from "@/components/support/support-knowledge-feedback-form";

const initialState: SupportActionState = {};

type SupportKnowledgeAiPreviewFormProps = {
  tenantId?: string | null;
  allowTenantInput?: boolean;
};

export function SupportKnowledgeAiPreviewForm({
  tenantId,
  allowTenantInput = false,
}: SupportKnowledgeAiPreviewFormProps) {
  const [state, formAction] = useActionState(previewSupportKnowledgeReplyAction, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      {allowTenantInput ? (
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Tenant ID opcional</span>
          <input
            name="tenantId"
            defaultValue={tenantId ?? ""}
            placeholder="Vacio = solo FAQs globales"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
      ) : tenantId ? (
        <input type="hidden" name="tenantId" value={tenantId} />
      ) : null}

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Mensaje de prueba</span>
        <textarea
          name="message"
          rows={5}
          placeholder="Ej: El cliente quiere cambiar su dominio y no sabe si esta incluido en el plan."
          className="min-h-32 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Probar respuesta IA
      </button>

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}

      {state.reply ? (
        <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
            Contexto usado
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            FAQs encontradas: {state.knowledgeItemCount ?? 0}
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">{state.reply}</p>
          {state.responseLogId ? (
            <div className="mt-4">
              <SupportKnowledgeFeedbackForm responseLogId={state.responseLogId} />
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

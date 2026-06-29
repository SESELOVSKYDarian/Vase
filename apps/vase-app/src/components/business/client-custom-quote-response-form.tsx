"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { respondToCustomizationQuoteAction } from "@/app/(platform)/app/owner/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

type ClientCustomQuoteResponseFormProps = {
  quoteId: string;
};

export function ClientCustomQuoteResponseForm({
  quoteId,
}: ClientCustomQuoteResponseFormProps) {
  const [state, formAction] = useActionState(respondToCustomizationQuoteAction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)]0 p-5">
      <input type="hidden" name="quoteId" value={quoteId} />
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Tu decision</span>
        <select
          name="decision"
          defaultValue="ACCEPT"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        >
          <option value="ACCEPT">Aceptar presupuesto</option>
          <option value="REJECT">Rechazar y pedir revision</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Mensaje para el equipo Vase</span>
        <textarea
          name="responseMessage"
          rows={3}
          className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          placeholder="Puedes confirmar el alcance o explicar que puntos quieres revisar."
        />
      </label>

      <SubmitButton
        pendingLabel="Enviando respuesta..."
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
      >
        Enviar decision
      </SubmitButton>

      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { integrationScopes } from "@/config/integrations";
import {
  createIntegrationCredentialAction,
  type IntegrationActionState,
} from "@/app/(platform)/app/owner/integrations/api/actions";

const initialState: IntegrationActionState = {};

export function IntegrationCredentialForm() {
  const [state, formAction] = useActionState(createIntegrationCredentialAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Nombre de la credencial</span>
        <input
          name="name"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          placeholder="ERP principal"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Limite por minuto</span>
        <input
          name="requestsPerMinute"
          type="number"
          min={30}
          max={2000}
          defaultValue={120}
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>

      <div className="grid gap-3">
        <p className="text-sm font-medium text-[var(--foreground)]">Scopes permitidos</p>
        <div className="grid gap-2 md:grid-cols-2">
          {integrationScopes.map((scope) => (
            <label
              key={scope}
              className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 text-sm text-[var(--foreground)]"
            >
              <input type="checkbox" name="scopes" value={scope} defaultChecked />
              <span>{scope}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Generar API key
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.secret ? (
        <pre className="overflow-x-auto rounded-[22px] bg-[var(--accent-strong)] p-4 text-sm text-[var(--foreground)]">
          <code>{state.secret}</code>
        </pre>
      ) : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

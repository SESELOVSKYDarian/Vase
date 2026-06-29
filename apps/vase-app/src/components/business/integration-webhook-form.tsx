"use client";

import { useActionState } from "react";
import { webhookEventCatalog } from "@/config/integrations";
import {
  createIntegrationWebhookAction,
  type IntegrationActionState,
} from "@/app/(platform)/app/owner/integrations/api/actions";

const initialState: IntegrationActionState = {};

export function IntegrationWebhookForm() {
  const [state, formAction] = useActionState(createIntegrationWebhookAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Nombre del webhook</span>
        <input
          name="name"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          placeholder="Pedidos ERP"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">URL destino</span>
        <input
          name="url"
          type="url"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          placeholder="https://erp.ejemplo.com/webhooks/vase"
        />
      </label>

      <div className="grid gap-2">
        <p className="text-sm font-medium text-[var(--foreground)]">Eventos</p>
        {webhookEventCatalog.map((event) => (
          <label
            key={event.key}
            className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 py-3 text-sm"
          >
            <input type="checkbox" name="eventTypes" value={event.key} defaultChecked />
            <span>
              <span className="font-semibold text-[var(--foreground)]">{event.key}</span>
              <span className="mt-1 block leading-6 text-[var(--muted)]">{event.description}</span>
            </span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Registrar webhook
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

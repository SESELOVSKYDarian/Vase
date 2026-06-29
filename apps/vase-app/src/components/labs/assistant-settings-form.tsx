"use client";

import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { updateLabsAssistantSettingsAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

type AssistantSettingsFormProps = {
  assistantDisplayName: string;
  tone: string;
  timezone: string;
  hoursStart: string;
  hoursEnd: string;
  humanEscalationEnabled: boolean;
  escalationDestination: string;
  escalationContact?: string | null;
  premiumToneEnabled: boolean;
};

export function AssistantSettingsForm(props: AssistantSettingsFormProps) {
  const [state, formAction] = useActionState(updateLabsAssistantSettingsAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Nombre del asistente</span>
          <input
            name="assistantDisplayName"
            defaultValue={props.assistantDisplayName}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Timezone</span>
          <input
            name="timezone"
            defaultValue={props.timezone}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Tono</span>
          <select
            name="tone"
            defaultValue={props.tone}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="PROFESSIONAL">Professional</option>
            <option value="WARM">Warm</option>
            <option value="CONCISE">Concise</option>
            <option value="FRIENDLY">Friendly</option>
            <option value="PREMIUM" disabled={!props.premiumToneEnabled}>
              Premium
            </option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Escalamiento</span>
          <select
            name="escalationDestination"
            defaultValue={props.escalationDestination}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="HUMAN_QUEUE">Human Queue</option>
            <option value="CRM">CRM</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Horario inicio</span>
          <input
            name="hoursStart"
            defaultValue={props.hoursStart}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Horario fin</span>
          <input
            name="hoursEnd"
            defaultValue={props.hoursEnd}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Contacto para escalar</span>
        <input
          name="escalationContact"
          defaultValue={props.escalationContact ?? ""}
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 py-3 text-sm text-[var(--foreground)]">
        <input
          name="humanEscalationEnabled"
          type="checkbox"
          defaultChecked={props.humanEscalationEnabled}
        />
        <span>Habilitar escalamiento a humano</span>
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar configuracion
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

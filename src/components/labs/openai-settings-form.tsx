"use client";

import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { updateLabsOpenAiSettingsAction } from "@/app/(platform)/app/owner/labs/actions";
import { DEFAULT_OPENAI_MODEL } from "@/lib/labs/openai-config";

const initialState: LabsActionState = {};

type OpenAiSettingsFormProps = {
  enabled: boolean;
  model?: string | null;
  hasApiKey: boolean;
  temperature: number;
  systemPrompt?: string | null;
};

export function OpenAiSettingsForm(props: OpenAiSettingsFormProps) {
  const [state, formAction, pending] = useActionState(updateLabsOpenAiSettingsAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 py-3 text-sm text-[var(--foreground)]">
        <input name="openaiEnabled" type="checkbox" defaultChecked={props.enabled} />
        <span>Usar ChatGPT/OpenAI para responder conversaciones</span>
      </label>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Modelo</span>
          <input
            name="openaiModel"
            defaultValue={props.model || DEFAULT_OPENAI_MODEL}
            placeholder={DEFAULT_OPENAI_MODEL}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Temperatura</span>
          <input
            name="temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            defaultValue={props.temperature}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">API key de OpenAI</span>
        <input
          name="openaiApiKey"
          type="password"
          placeholder={props.hasApiKey ? "Clave guardada. Deja vacio para conservarla." : "sk-..."}
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>

      {props.hasApiKey ? (
        <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 py-3 text-sm text-[var(--muted)]">
          <input name="clearOpenAiApiKey" type="checkbox" />
          <span>Eliminar API key guardada</span>
        </label>
      ) : null}

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Prompt del agente</span>
        <textarea
          name="systemPrompt"
          rows={8}
          defaultValue={props.systemPrompt ?? ""}
          placeholder="Sos el asistente comercial de Vase Labs. Responde natural, breve y orientado a ventas..."
          className="rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar conexion ChatGPT"}
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

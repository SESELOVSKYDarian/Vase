"use client";

import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { connectLabsChannelAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

type ChannelConnectionFormProps = {
  canUseInstagram: boolean;
};

export function ChannelConnectionForm({ canUseInstagram }: ChannelConnectionFormProps) {
  const [state, formAction] = useActionState(connectLabsChannelAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Canal</span>
          <select
            name="channelType"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="WEBCHAT">Webchat</option>
            <option value="INSTAGRAM" disabled={!canUseInstagram}>
              Instagram
            </option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Nombre de la cuenta</span>
          <input
            name="accountLabel"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Handle o telefono</span>
        <input
          name="externalHandle"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Notas</span>
        <textarea
          name="notes"
          rows={3}
          className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Conectar canal
      </button>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

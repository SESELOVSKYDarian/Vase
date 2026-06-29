"use client";

import { useActionState } from "react";
import type { FormEvent } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { deleteLabsChannelAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

export function ChannelDeleteForm({ channelId }: { channelId: string }) {
  const [state, formAction] = useActionState(deleteLabsChannelAction, initialState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Esta accion desconecta el canal. Quieres continuar?")) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-2">
      <input type="hidden" name="channelId" value={channelId} />
      <button
        type="submit"
        className="labs-button border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]"
      >
        Eliminar
      </button>
      {state.error ? <p className="text-xs leading-5 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs leading-5 text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { deleteLabsChannelAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};

export function ChannelDeleteForm({ channelId }: { channelId: string }) {
  const [state, formAction] = useActionState(deleteLabsChannelAction, initialState);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="channelId" value={channelId} />
      <button
        type="submit"
        className="min-h-10 rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] px-4 text-xs font-semibold text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,white)]"
      >
        Eliminar
      </button>
      {state.error ? <p className="text-xs leading-5 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs leading-5 text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  takeSupportTicketAction,
  type SupportActionState,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

export function SupportTicketTakeForm({ ticketId }: { ticketId: string }) {
  const [state, formAction] = useActionState(takeSupportTicketAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <button
        type="submit"
        className="min-h-10 rounded-full border border-[var(--accent-strong)] px-4 text-xs font-semibold text-[var(--accent-strong)]"
      >
        Tomar ticket
      </button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

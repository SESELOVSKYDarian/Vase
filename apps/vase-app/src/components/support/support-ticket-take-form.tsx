"use client";

import { useActionState, useEffect } from "react";
import {
  takeSupportTicketAction,
  type SupportActionState,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

export function SupportTicketTakeForm({
  ticketId,
  onResult,
}: {
  ticketId: string;
  onResult?: (result: { tone: "success" | "error"; message: string }) => void;
}) {
  const [state, formAction] = useActionState(takeSupportTicketAction, initialState);

  useEffect(() => {
    if (!onResult) return;
    if (state.success) onResult({ tone: "success", message: state.success });
    if (state.error) onResult({ tone: "error", message: state.error });
  }, [onResult, state.error, state.success]);

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

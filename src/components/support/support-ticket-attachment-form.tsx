"use client";

import { useActionState, useEffect } from "react";
import {
  addSupportTicketAttachmentAction,
  type SupportActionState,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

export function SupportTicketAttachmentForm({
  ticketId,
  onResult,
}: {
  ticketId: string;
  onResult?: (result: { tone: "success" | "error"; message: string }) => void;
}) {
  const [state, formAction] = useActionState(addSupportTicketAttachmentAction, initialState);

  useEffect(() => {
    if (!onResult) return;
    if (state.success) onResult({ tone: "success", message: state.success });
    if (state.error) onResult({ tone: "error", message: state.error });
  }, [onResult, state.error, state.success]);

  return (
    <form action={formAction} className="grid gap-2 rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input name="file" type="file" className="text-xs" />
      <button className="min-h-10 rounded-full border border-[var(--border-subtle)] px-4 text-xs font-semibold text-[var(--foreground)]">
        Adjuntar archivo
      </button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

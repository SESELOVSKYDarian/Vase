"use client";

import { useActionState } from "react";
import {
  addSupportTicketAttachmentAction,
  type SupportActionState,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

export function SupportTicketAttachmentForm({ ticketId }: { ticketId: string }) {
  const [state, formAction] = useActionState(addSupportTicketAttachmentAction, initialState);

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

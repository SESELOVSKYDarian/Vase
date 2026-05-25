"use client";

import { useActionState } from "react";
import { requestCustomProjectMeetingAction } from "@/app/(platform)/app/owner/actions";

type Meeting = {
  id: string;
  type: string;
  status: string;
  isEnabledByAdmin: boolean;
  requestedDate: Date | null;
  confirmedDate: Date | null;
};

type Props = {
  requestId: string;
  meetings: Meeting[];
};

export function CustomProjectMeetingRequestForm({ requestId, meetings }: Props) {
  const [state, action, pending] = useActionState(requestCustomProjectMeetingAction, {});
  const enabledMeetings = meetings.filter((meeting) => meeting.isEnabledByAdmin);
  if (enabledMeetings.length === 0) {
    return <p className="text-xs text-[var(--muted)]">Aun no hay reuniones habilitadas por administracion.</p>;
  }

  return (
    <form action={action} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-4">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="text-xs text-[var(--muted)]">Agendar reunion habilitada</label>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <select name="meetingType" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
          {enabledMeetings.map((meeting) => (
            <option key={meeting.id} value={meeting.type}>{meeting.type}</option>
          ))}
        </select>
        <input name="requestedDate" type="datetime-local" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
        <button disabled={pending} className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">
          Solicitar
        </button>
      </div>
      {state.success ? <p className="text-xs text-[var(--accent-strong)]">{state.success}</p> : null}
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  addDevTaskAttachmentAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

export function AdminDevTaskAttachmentForm({ taskId }: { taskId: string }) {
  const [state, formAction] = useActionState(addDevTaskAttachmentAction, initialState);

  return (
    <form action={formAction} className="grid gap-2 rounded-xl border border-[var(--border-subtle)] p-3">
      <input type="hidden" name="taskId" value={taskId} />
      <input name="file" type="file" className="text-xs" />
      <button className="w-fit rounded-xl border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold">
        Subir adjunto
      </button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

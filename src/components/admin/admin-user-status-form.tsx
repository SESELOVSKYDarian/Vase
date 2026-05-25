"use client";

import { useActionState } from "react";
import { type AdminGovernanceActionState, updateUserStatusAction } from "@/app/(platform)/app/admin/actions";

type Props = {
  userId: string;
  isDisabled: boolean;
};

const initialState: AdminGovernanceActionState = {};

export function AdminUserStatusForm({ userId, isDisabled }: Props) {
  const [state, formAction] = useActionState(updateUserStatusAction, initialState);

  return (
    <form action={formAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isDisabled" value={(!isDisabled).toString()} />
      <input name="disabledReason" placeholder="Motivo (opcional)" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-xs" />
      <button className="min-h-10 rounded-xl border border-[var(--border-subtle)] px-3 text-xs font-semibold">
        {isDisabled ? "Reactivar usuario" : "Desactivar usuario"}
      </button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

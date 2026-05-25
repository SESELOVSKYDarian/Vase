"use client";

import { useActionState } from "react";
import { type AdminPasswordResetActionState, resetUserPasswordByAdminAction } from "@/app/(platform)/app/admin/actions";

type Props = {
  userId: string;
};

const initialState: AdminPasswordResetActionState = {};

export function AdminUserPasswordResetForm({ userId }: Props) {
  const [state, formAction] = useActionState(resetUserPasswordByAdminAction, initialState);

  return (
    <form action={formAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3">
      <input type="hidden" name="userId" value={userId} />
      <button className="min-h-10 rounded-xl border border-[var(--border-subtle)] px-3 text-xs font-semibold">
        Restablecer contrasena
      </button>
      {state.generatedPassword ? (
        <p className="rounded-xl bg-[var(--accent-soft)] p-2 text-xs text-[var(--accent-strong)]">
          Temporal: <strong>{state.generatedPassword}</strong>
        </p>
      ) : null}
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

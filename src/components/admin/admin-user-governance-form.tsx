"use client";

import { useActionState } from "react";
import {
  type AdminGovernanceActionState,
  updateUserGovernanceAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type AdminUserGovernanceFormProps = {
  userId: string;
  platformRole: string;
};

export function AdminUserGovernanceForm(props: AdminUserGovernanceFormProps) {
  const [state, formAction] = useActionState(updateUserGovernanceAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="userId" value={props.userId} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Rol de plataforma</span>
          <select
            name="platformRole"
            defaultValue={props.platformRole}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="USER">User</option>
            <option value="SUPPORT">Support</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </label>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          Para cortar acceso operativo completo, suspende el tenant desde gobierno de cuentas.
        </div>
      </div>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar usuario
      </button>
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

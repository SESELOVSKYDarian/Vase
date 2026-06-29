"use client";

import { useActionState } from "react";
import { type AdminGovernanceActionState, upsertUserRolesAction } from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "CLIENTE", label: "Cliente" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "DESIGNER", label: "Designer" },
  { value: "TESTER", label: "Tester" },
  { value: "SOPORTE", label: "Soporte" },
] as const;

type Props = {
  userId: string;
  selectedRoles: string[];
};

export function AdminUserRolesForm({ userId, selectedRoles }: Props) {
  const [state, formAction] = useActionState(upsertUserRolesAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-soft)]">Roles combinados</p>
      <div className="grid gap-2 md:grid-cols-3">
        {roleOptions.map((role) => (
          <label key={role.value} className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs">
            <input
              type="checkbox"
              name="roles"
              value={role.value}
              defaultChecked={selectedRoles.includes(role.value)}
            />
            {role.label}
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar roles
      </button>
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

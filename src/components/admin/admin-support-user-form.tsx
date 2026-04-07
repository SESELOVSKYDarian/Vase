"use client";

import { useActionState } from "react";
import {
  createSupportUserAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

export function AdminSupportUserForm() {
  const [state, formAction] = useActionState(createSupportUserAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Nombre</span>
          <input
            name="name"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            placeholder="Agente Vase"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Email</span>
          <input
            name="email"
            type="email"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            placeholder="soporte@vase.com"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Password temporal</span>
          <input
            name="password"
            type="password"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            placeholder="Minimo 10 caracteres"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Rol</span>
          <select
            name="platformRole"
            defaultValue="SUPPORT"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="SUPPORT">Support</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Crear usuario interno
      </button>

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

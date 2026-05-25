"use client";

import { useActionState } from "react";
import { createAdminNotificationAction, type AdminGovernanceActionState } from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

export function AdminNotificationForm() {
  const [state, formAction] = useActionState(createAdminNotificationAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
      <input name="title" placeholder="Titulo" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <textarea name="message" placeholder="Mensaje" rows={3} className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
      <div className="grid gap-2 md:grid-cols-3">
        <select name="target" defaultValue="ALL" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
          <option value="ALL">Todos</option>
          <option value="TENANT">Tenant</option>
          <option value="PLATFORM_ROLE">Rol</option>
          <option value="USERS">Usuarios</option>
        </select>
        <input name="tenantId" placeholder="tenantId (si aplica)" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
        <input name="targetUserIds" placeholder="userIds separados por coma" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      </div>
      <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">Crear notificacion</button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

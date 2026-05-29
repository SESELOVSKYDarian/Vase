"use client";

import { useActionState } from "react";
import {
  createManualUserByAdminAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type TenantOption = {
  id: string;
  accountName: string;
  name: string;
};

export function AdminManualUserCreateForm({ tenants }: { tenants: TenantOption[] }) {
  const [state, formAction] = useActionState(createManualUserByAdminAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input
          name="name"
          placeholder="Nombre y apellido"
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        />
        <input
          name="email"
          type="email"
          placeholder="email@cliente.com"
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        />
        <input
          name="password"
          type="password"
          placeholder="Contrasena elegida por admin"
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <select
          name="tenantId"
          defaultValue=""
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        >
          <option value="">Sin tenant por ahora</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.accountName} - {tenant.name}
            </option>
          ))}
        </select>
        <select
          name="tenantRole"
          defaultValue="MEMBER"
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        >
          <option value="OWNER">Owner</option>
          <option value="MANAGER">Manager</option>
          <option value="MEMBER">Member</option>
        </select>
        <select
          name="membershipStatus"
          defaultValue="ACTIVE"
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        >
          <option value="ACTIVE">Activo</option>
          <option value="INVITED">Invitado</option>
          <option value="SUSPENDED">Suspendido</option>
        </select>
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs">
          <input name="businessAccess" type="checkbox" />
          Vase Business
        </label>
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs">
          <input name="labsAccess" type="checkbox" />
          Vase Labs
        </label>
      </div>

      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs">
        <input name="forcePasswordChange" type="checkbox" defaultChecked />
        Forzar cambio de contrasena en primer login
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          Crea usuario verificado de forma manual, sin paso de verificacion por email.
        </p>
        <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-4 text-xs font-semibold text-[var(--accent-contrast)]">
          Crear cuenta manual
        </button>
      </div>

      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

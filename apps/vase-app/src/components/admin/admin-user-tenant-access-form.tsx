"use client";

import { useActionState } from "react";
import {
  type AdminGovernanceActionState,
  updateUserTenantAccessAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type TenantOption = {
  id: string;
  accountName: string;
  name: string;
};

type AdminUserTenantAccessFormProps = {
  userId: string;
  tenants: TenantOption[];
  defaultTenantId?: string;
  defaultRole?: string;
  defaultStatus?: string;
  businessAccess?: boolean;
  labsAccess?: boolean;
  title?: string;
};

export function AdminUserTenantAccessForm({
  userId,
  tenants,
  defaultTenantId = "",
  defaultRole = "MEMBER",
  defaultStatus = "ACTIVE",
  businessAccess = false,
  labsAccess = false,
  title = "Asignar acceso",
}: AdminUserTenantAccessFormProps) {
  const [state, formAction] = useActionState(updateUserTenantAccessAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] p-3">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">{title}</p>
      <div className="grid gap-2 md:grid-cols-5">
        <select
          name="tenantId"
          required
          defaultValue={defaultTenantId}
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        >
          <option value="" disabled>
            Tenant
          </option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.accountName} - {tenant.name}
            </option>
          ))}
        </select>
        <select
          name="tenantRole"
          defaultValue={defaultRole}
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        >
          <option value="OWNER">Owner</option>
          <option value="MANAGER">Manager</option>
          <option value="MEMBER">Member</option>
        </select>
        <select
          name="membershipStatus"
          defaultValue={defaultStatus}
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        >
          <option value="ACTIVE">Activo</option>
          <option value="INVITED">Invitado</option>
          <option value="SUSPENDED">Suspendido</option>
        </select>
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs">
          <input name="businessAccess" type="checkbox" defaultChecked={businessAccess} />
          Vase Business
        </label>
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs">
          <input name="labsAccess" type="checkbox" defaultChecked={labsAccess} />
          Vase Labs
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-[var(--muted)]">
          Business y Labs se activan por tenant; todos los usuarios de ese tenant veran el modulo contratado.
        </p>
        <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-4 text-xs font-semibold text-[var(--accent-contrast)]">
          Guardar acceso
        </button>
      </div>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

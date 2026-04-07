"use client";

import { useActionState } from "react";
import {
  type AdminGovernanceActionState,
  updateTenantGovernanceAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type AdminTenantGovernanceFormProps = {
  tenantId: string;
  status: string;
  plan: string;
  billingStatus: string;
  premiumEnabled: boolean;
  customDomainEnabled: boolean;
  temporaryPagesEnabled: boolean;
};

export function AdminTenantGovernanceForm(props: AdminTenantGovernanceFormProps) {
  const [state, formAction] = useActionState(updateTenantGovernanceAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="tenantId" value={props.tenantId} />

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Estado</span>
          <select
            name="status"
            defaultValue={props.status}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="ACTIVE">Activo</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Plan</span>
          <select
            name="plan"
            defaultValue={props.plan}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="START">Start</option>
            <option value="PREMIUM">Premium</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Cobro</span>
          <select
            name="billingStatus"
            defaultValue={props.billingStatus}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Activo</option>
            <option value="PAST_DUE">Pendiente</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-sm text-[var(--foreground)]">
          <input name="premiumEnabled" type="checkbox" defaultChecked={props.premiumEnabled} />
          <span>Premium activo</span>
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-sm text-[var(--foreground)]">
          <input
            name="customDomainEnabled"
            type="checkbox"
            defaultChecked={props.customDomainEnabled}
          />
          <span>Dominio propio</span>
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-sm text-[var(--foreground)]">
          <input
            name="temporaryPagesEnabled"
            type="checkbox"
            defaultChecked={props.temporaryPagesEnabled}
          />
          <span>Temporales habilitadas</span>
        </label>
      </div>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar gobierno
      </button>

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

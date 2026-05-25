"use client";

import { useActionState } from "react";
import { type AdminGovernanceActionState, updateTenantBillingSnapshotAction } from "@/app/(platform)/app/admin/actions";

type Props = {
  tenantId: string;
  paidAt?: Date | null;
  nextBillingAt?: Date | null;
  hostingEndsAt?: Date | null;
  maintenanceEndsAt?: Date | null;
};

const initialState: AdminGovernanceActionState = {};

function toDateInput(value?: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function AdminTenantBillingForm({ tenantId, paidAt, nextBillingAt, hostingEndsAt, maintenanceEndsAt }: Props) {
  const [state, formAction] = useActionState(updateTenantBillingSnapshotAction, initialState);
  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-2 md:grid-cols-2">
        <input name="paidAt" type="date" defaultValue={toDateInput(paidAt)} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-xs" />
        <input name="nextBillingAt" type="date" defaultValue={toDateInput(nextBillingAt)} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-xs" />
        <input name="hostingEndsAt" type="date" defaultValue={toDateInput(hostingEndsAt)} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-xs" />
        <input name="maintenanceEndsAt" type="date" defaultValue={toDateInput(maintenanceEndsAt)} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-xs" />
      </div>
      <input name="cancelReason" placeholder="Motivo cancelacion (opcional)" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-xs" />
      <div className="flex gap-2">
        <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-xs font-semibold text-[var(--accent-contrast)]">Guardar billing</button>
        <button name="cancelPlan" value="true" className="min-h-10 rounded-xl border border-[var(--danger)] px-3 text-xs font-semibold text-[var(--danger)]">Cancelar plan</button>
      </div>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

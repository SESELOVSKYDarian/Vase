"use client";

import { useActionState } from "react";
import {
  type AdminGovernanceActionState,
  updateAdminModulePricingAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type AdminModulePricingFormProps = {
  moduleId: string;
  price?: number | null;
  currency?: string | null;
  type?: "monthly" | "one_time" | null;
  isActive?: boolean;
};

export function AdminModulePricingForm(props: AdminModulePricingFormProps) {
  const [state, formAction] = useActionState(updateAdminModulePricingAction, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4"
    >
      <input type="hidden" name="moduleId" value={props.moduleId} />

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Precio</span>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={props.price ?? 0}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Moneda</span>
          <input
            name="currency"
            defaultValue={props.currency ?? "USD"}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Tipo</span>
          <select
            name="type"
            defaultValue={props.type ?? "monthly"}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="monthly">Mensual</option>
            <option value="one_time">Unico</option>
          </select>
        </label>
      </div>

      <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-sm text-[var(--foreground)]">
        <input name="isActive" type="checkbox" defaultChecked={props.isActive ?? true} />
        <span>Pricing activo</span>
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full border border-[var(--accent)] px-5 text-sm font-semibold text-[var(--foreground)]"
      >
        Actualizar pricing
      </button>

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

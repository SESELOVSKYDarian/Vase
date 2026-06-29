"use client";

import { useActionState } from "react";
import {
  type AdminGovernanceActionState,
  updateAdminModuleAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type AdminModuleFormProps = {
  moduleId: string;
  name: string;
  description?: string | null;
  route: string;
  isActive: boolean;
};

export function AdminModuleForm(props: AdminModuleFormProps) {
  const [state, formAction] = useActionState(updateAdminModuleAction, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4"
    >
      <input type="hidden" name="moduleId" value={props.moduleId} />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Nombre tecnico</span>
          <input
            name="name"
            defaultValue={props.name}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Ruta</span>
          <input
            name="route"
            defaultValue={props.route}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Descripcion</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={props.description ?? ""}
          className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>

      <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-sm text-[var(--foreground)]">
        <input name="isActive" type="checkbox" defaultChecked={props.isActive} />
        <span>Modulo activo</span>
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full border border-[var(--accent)] px-5 text-sm font-semibold text-[var(--foreground)]"
      >
        Guardar modulo
      </button>

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}


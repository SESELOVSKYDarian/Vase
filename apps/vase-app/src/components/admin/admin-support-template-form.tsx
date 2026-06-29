"use client";

import { useActionState } from "react";
import {
  type AdminGovernanceActionState,
  updateSupportReplyTemplateAdminAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type AdminSupportTemplateFormProps = {
  templateId: string;
  name: string;
  category?: string | null;
  body: string;
  isActive: boolean;
};

export function AdminSupportTemplateForm(props: AdminSupportTemplateFormProps) {
  const [state, formAction] = useActionState(updateSupportReplyTemplateAdminAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="templateId" value={props.templateId} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Nombre</span>
          <input
            name="name"
            defaultValue={props.name}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Categoria</span>
          <input
            name="category"
            defaultValue={props.category ?? ""}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Cuerpo</span>
        <textarea
          name="body"
          rows={4}
          defaultValue={props.body}
          className="min-h-28 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-sm text-[var(--foreground)]">
        <input name="isActive" type="checkbox" defaultChecked={props.isActive} />
        <span>Template activo</span>
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar template
      </button>
      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

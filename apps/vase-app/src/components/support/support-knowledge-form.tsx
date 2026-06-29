"use client";

import { useActionState } from "react";
import type { SupportActionState } from "@/app/(platform)/app/support/actions";
import {
  createSupportKnowledgeAction,
  updateSupportKnowledgeAction,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type SupportKnowledgeFormProps = {
  mode: "create" | "update";
  knowledgeId?: string;
  tenantId?: string | null;
  question?: string;
  answer?: string;
  category?: string | null;
  tags?: string[];
  isActive?: boolean;
  allowTenantInput?: boolean;
};

export function SupportKnowledgeForm(props: SupportKnowledgeFormProps) {
  const action = props.mode === "create" ? createSupportKnowledgeAction : updateSupportKnowledgeAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4"
    >
      {props.mode === "update" ? (
        <input type="hidden" name="knowledgeId" value={props.knowledgeId} />
      ) : null}

      {props.allowTenantInput ? (
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Tenant ID opcional</span>
          <input
            name="tenantId"
            defaultValue={props.tenantId ?? ""}
            placeholder="Vacio = FAQ global"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
      ) : props.tenantId ? (
        <input type="hidden" name="tenantId" value={props.tenantId} />
      ) : null}

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Pregunta</span>
        <input
          name="question"
          defaultValue={props.question ?? ""}
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Respuesta</span>
        <textarea
          name="answer"
          rows={5}
          defaultValue={props.answer ?? ""}
          className="min-h-32 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Categoria</span>
          <input
            name="category"
            defaultValue={props.category ?? ""}
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Etiquetas</span>
          <input
            name="tags"
            defaultValue={(props.tags ?? []).join(", ")}
            placeholder="billing, dominio, soporte"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
        </label>
      </div>

      <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-sm text-[var(--foreground)]">
        <input name="isActive" type="checkbox" defaultChecked={props.isActive ?? true} />
        <span>FAQ activa</span>
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        {props.mode === "create" ? "Crear FAQ" : "Guardar FAQ"}
      </button>

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}


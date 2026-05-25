"use client";

import { useActionState } from "react";
import {
  deleteFaqItemByAdminAction,
  type AdminGovernanceActionState,
  upsertFaqItemByAdminAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isActive: boolean;
  tags: unknown;
};

function normalizeTags(tags: unknown) {
  return Array.isArray(tags) ? tags.map((value) => String(value)).filter(Boolean) : [];
}

function FaqRowEditor({ item }: { item: FaqItem }) {
  const [state, formAction] = useActionState(upsertFaqItemByAdminAction, initialState);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] p-4">
      <div className="grid gap-2">
        <form action={formAction} className="grid gap-2">
          <input type="hidden" name="id" value={item.id} />
          <input
            name="question"
            defaultValue={item.question}
            className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
          />
          <textarea
            name="answer"
            rows={3}
            defaultValue={item.answer}
            className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
          />
          <div className="grid gap-2 md:grid-cols-3">
            <input
              name="category"
              defaultValue={item.category ?? ""}
              placeholder="Categoria"
              className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
            />
            <input
              name="tags"
              defaultValue={normalizeTags(item.tags).join(", ")}
              placeholder="tags separadas por coma"
              className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm">
              <input name="isActive" type="checkbox" defaultChecked={item.isActive} />
              <span>Activa</span>
            </label>
          </div>
          <button className="w-fit rounded-xl bg-[var(--accent-strong)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)]">
            Guardar
          </button>
        </form>
        <form action={deleteFaqItemByAdminAction}>
          <input type="hidden" name="id" value={item.id} />
          <button className="rounded-xl border border-[var(--danger)] px-4 py-2 text-xs font-semibold text-[var(--danger)]">
            Eliminar
          </button>
        </form>
        {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
        {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
      </div>
    </div>
  );
}

export function AdminFaqEditor({ items }: { items: FaqItem[] }) {
  const [state, formAction] = useActionState(upsertFaqItemByAdminAction, initialState);

  return (
    <div className="grid gap-6">
      <form action={formAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-4">
        <p className="text-sm font-semibold">Crear FAQ</p>
        <input name="question" placeholder="Pregunta" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
        <textarea name="answer" rows={3} placeholder="Respuesta" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
        <div className="grid gap-2 md:grid-cols-3">
          <input name="category" placeholder="Categoria" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
          <input name="tags" placeholder="tags separadas por coma" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked />
            <span>Activa</span>
          </label>
        </div>
        <button className="w-fit rounded-xl bg-[var(--accent-strong)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)]">
          Crear FAQ
        </button>
        {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
        {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
      </form>

      <div className="grid gap-3">
        {items.map((item) => (
          <FaqRowEditor key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

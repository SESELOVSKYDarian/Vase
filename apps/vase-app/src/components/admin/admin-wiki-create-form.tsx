"use client";

import { useActionState } from "react";
import { createWikiDocumentAction, type AdminGovernanceActionState } from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

export function AdminWikiCreateForm() {
  const [state, formAction] = useActionState(createWikiDocumentAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
      <input name="title" placeholder="Titulo del documento" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <input name="slug" placeholder="slug-documento" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <input name="summary" placeholder="Resumen" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <select name="status" defaultValue="DRAFT" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
        <option value="DRAFT">Borrador</option>
        <option value="PUBLISHED">Publicado</option>
        <option value="ARCHIVED">Archivado</option>
      </select>
      <input name="sectionTitle" placeholder="Titulo de seccion inicial" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <textarea name="sectionBody" rows={4} placeholder="Contenido de la seccion inicial" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
      <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">Crear wiki</button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  createDevTaskAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

export function AdminDevTaskCreateForm({
  developers,
}: {
  developers: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState(createDevTaskAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] p-4">
      <input name="title" placeholder="Titulo de tarea" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <textarea name="description" placeholder="Descripcion" rows={3} className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
      <div className="grid gap-2 md:grid-cols-4">
        <select name="taskType" defaultValue="OTHER" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
          <option value="FRONTEND">Frontend</option>
          <option value="BACKEND">Backend</option>
          <option value="DATABASE">Base de datos</option>
          <option value="DESIGN">Diseno</option>
          <option value="DEPLOY">Deploy</option>
          <option value="BUG">Bug</option>
          <option value="INTEGRATION">Integracion</option>
          <option value="AUTOMATION">Automatizacion</option>
          <option value="AI">IA</option>
          <option value="OTHER">Otro</option>
        </select>
        <select name="priority" defaultValue="MEDIUM" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="URGENT">Urgente</option>
        </select>
        <select name="status" defaultValue="PENDING" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
          <option value="PENDING">Pendiente</option>
          <option value="IN_PROGRESS">En progreso</option>
          <option value="IN_REVIEW">En revision</option>
          <option value="BLOCKED">Bloqueada</option>
          <option value="COMPLETED">Completada</option>
          <option value="CANCELED">Cancelada</option>
        </select>
        <select name="assignedToUserId" defaultValue="" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
          <option value="">Sin asignar</option>
          {developers.map((developer) => (
            <option key={developer.id} value={developer.id}>
              {developer.name}
            </option>
          ))}
        </select>
      </div>
      <input name="dueAt" type="date" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">Crear tarea</button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  addDevTaskCommentAction,
  type AdminGovernanceActionState,
  updateDevTaskAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type Task = {
  id: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  status: string;
  assignedToUserId: string | null;
  dueAt: Date | null;
};

export function AdminDevTaskUpdateForm({
  task,
  developers,
}: {
  task: Task;
  developers: Array<{ id: string; name: string }>;
}) {
  const [updateState, updateAction] = useActionState(updateDevTaskAction, initialState);
  const [commentState, commentAction] = useActionState(addDevTaskCommentAction, initialState);

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] p-4">
      <form action={updateAction} className="grid gap-2">
        <input type="hidden" name="taskId" value={task.id} />
        <input name="title" defaultValue={task.title} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
        <textarea name="description" defaultValue={task.description} rows={3} className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
        <div className="grid gap-2 md:grid-cols-4">
          <select name="taskType" defaultValue={task.taskType} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
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
          <select name="priority" defaultValue={task.priority} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
          <select name="status" defaultValue={task.status} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="PENDING">Pendiente</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="IN_REVIEW">En revision</option>
            <option value="BLOCKED">Bloqueada</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELED">Cancelada</option>
          </select>
          <select name="assignedToUserId" defaultValue={task.assignedToUserId ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Sin asignar</option>
            {developers.map((developer) => (
              <option key={developer.id} value={developer.id}>{developer.name}</option>
            ))}
          </select>
        </div>
        <input
          name="dueAt"
          type="date"
          defaultValue={task.dueAt ? task.dueAt.toISOString().slice(0, 10) : ""}
          className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
        />
        <button className="w-fit rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold">Guardar cambios</button>
        {updateState.error ? <p className="text-xs text-[var(--danger)]">{updateState.error}</p> : null}
        {updateState.success ? <p className="text-xs text-[var(--success)]">{updateState.success}</p> : null}
      </form>

      <form action={commentAction} className="grid gap-2">
        <input type="hidden" name="taskId" value={task.id} />
        <textarea name="body" rows={2} placeholder="Agregar comentario de avance" className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm" />
        <button className="w-fit rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold">Comentar</button>
        {commentState.error ? <p className="text-xs text-[var(--danger)]">{commentState.error}</p> : null}
        {commentState.success ? <p className="text-xs text-[var(--success)]">{commentState.success}</p> : null}
      </form>
    </div>
  );
}

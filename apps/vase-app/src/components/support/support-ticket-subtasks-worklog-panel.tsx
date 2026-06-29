"use client";

import { useActionState, useEffect } from "react";
import {
  addSupportWorklogAction,
  createSupportSubtaskAction,
  deleteSupportSubtaskAction,
  type SupportActionState,
  updateSupportSubtaskAction,
} from "@/app/(platform)/app/support/actions";

const initialState: SupportActionState = {};

type Agent = { id: string; name: string };
type Subtask = {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELED";
  assignedToUserId: string | null;
};
type Worklog = {
  id: string;
  minutes: number;
  note: string | null;
  createdAt: string | Date;
  actorUser: { name: string } | null;
};

export function SupportTicketSubtasksWorklogPanel({
  ticketId,
  agents,
  subtasks,
  worklogs,
  onResult,
}: {
  ticketId: string;
  agents: Agent[];
  subtasks: Subtask[];
  worklogs: Worklog[];
  onResult?: (result: { tone: "success" | "error"; message: string }) => void;
}) {
  const [createState, createAction] = useActionState(createSupportSubtaskAction, initialState);
  const [updateState, updateAction] = useActionState(updateSupportSubtaskAction, initialState);
  const [deleteState, deleteAction] = useActionState(deleteSupportSubtaskAction, initialState);
  const [worklogState, worklogAction] = useActionState(addSupportWorklogAction, initialState);

  useEffect(() => {
    if (!onResult) return;
    const states = [createState, updateState, deleteState, worklogState];
    for (const state of states) {
      if (state.success) onResult({ tone: "success", message: state.success });
      if (state.error) onResult({ tone: "error", message: state.error });
    }
  }, [createState, updateState, deleteState, worklogState, onResult]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
        <p className="text-xs font-semibold text-[var(--foreground)]">Subtareas</p>
        <form action={createAction} className="grid gap-2 md:grid-cols-3">
          <input type="hidden" name="ticketId" value={ticketId} />
          <input name="title" required placeholder="Nueva subtarea" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 text-xs md:col-span-2" />
          <select name="assignedToUserId" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-transparent px-2 text-xs">
            <option value="">Sin asignar</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <button className="min-h-10 rounded-lg bg-[var(--accent-strong)] px-3 text-xs font-semibold text-[var(--accent-contrast)] md:col-span-3">Agregar subtarea</button>
        </form>
        <div className="grid gap-2">
          {subtasks.length ? subtasks.map((subtask) => (
            <div key={subtask.id} className="grid gap-2 rounded-lg border border-[var(--border-subtle)] p-2">
              <form action={updateAction} className="grid gap-2 md:grid-cols-4">
                <input type="hidden" name="subtaskId" value={subtask.id} />
                <input name="title" defaultValue={subtask.title} className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-transparent px-2 text-xs md:col-span-2" />
                <select name="status" defaultValue={subtask.status} className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-transparent px-2 text-xs">
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_PROGRESS">En progreso</option>
                  <option value="DONE">Completada</option>
                  <option value="CANCELED">Cancelada</option>
                </select>
                <select name="assignedToUserId" defaultValue={subtask.assignedToUserId ?? ""} className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-transparent px-2 text-xs">
                  <option value="">Sin asignar</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
                <button className="min-h-9 rounded-lg border border-[var(--border-subtle)] px-2 text-xs font-semibold">Guardar</button>
              </form>
              <form action={deleteAction}>
                <input type="hidden" name="subtaskId" value={subtask.id} />
                <button className="min-h-8 rounded-lg border border-[var(--danger)] px-2 text-xs font-semibold text-[var(--danger)]">Eliminar</button>
              </form>
            </div>
          )) : <p className="text-xs text-[var(--muted)]">Sin subtareas todavía.</p>}
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
        <p className="text-xs font-semibold text-[var(--foreground)]">Horas del ticket</p>
        <form action={worklogAction} className="grid gap-2 md:grid-cols-3">
          <input type="hidden" name="ticketId" value={ticketId} />
          <input name="minutes" type="number" min="1" max="720" required placeholder="Minutos" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 text-xs" />
          <input name="note" placeholder="Nota (opcional)" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 text-xs md:col-span-2" />
          <button className="min-h-10 rounded-lg bg-[var(--accent-strong)] px-3 text-xs font-semibold text-[var(--accent-contrast)] md:col-span-3">Registrar horas</button>
        </form>
        <div className="grid gap-2">
          {worklogs.length ? worklogs.map((worklog) => (
            <article key={worklog.id} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--muted)]">{worklog.actorUser?.name ?? "Sistema"} · {Math.round(worklog.minutes / 60 * 100) / 100}h · {(typeof worklog.createdAt === "string" ? new Date(worklog.createdAt) : worklog.createdAt).toLocaleString("es-AR")}</p>
              {worklog.note ? <p className="text-sm text-[var(--foreground)]">{worklog.note}</p> : null}
            </article>
          )) : <p className="text-xs text-[var(--muted)]">Sin horas registradas.</p>}
        </div>
      </section>
    </div>
  );
}

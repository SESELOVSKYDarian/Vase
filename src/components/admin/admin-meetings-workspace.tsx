"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckSquare, Pencil, Plus, Trash2 } from "lucide-react";
import {
  addMeetingDecisionV2WithStateAction,
  addMeetingTaskV2WithStateAction,
  createMeetingV2WithStateAction,
  deleteMeetingV2WithStateAction,
  type AdminMeetingsActionState,
  updateMeetingV2WithStateAction,
} from "@/app/(platform)/app/admin/meetings/actions";
import { ActionToast } from "@/components/ui/action-toast";
import { CrudModal } from "@/components/ui/crud-modal";

type TenantLite = { id: string; accountName: string };
type AgentLite = { id: string; name: string };
type MeetingItem = {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  meetUrl: string | null;
  scheduledAt: string | null;
  description: string | null;
  createdAt: string;
  tenantLabel: string;
  tasks: Array<{ id: string; title: string; completed: boolean; dueDate: string | null; responsibleUserLabel: string | null }>;
  decisions: Array<{ id: string; description: string; createdAt: string }>;
};

const initialState: AdminMeetingsActionState = {};

function pickToast(state: AdminMeetingsActionState) {
  if (state.success) return { tone: "success" as const, message: state.success };
  if (state.error) return { tone: "error" as const, message: state.error };
  return null;
}

export function AdminMeetingsWorkspace({
  tenants,
  agents,
  meetings,
}: {
  tenants: TenantLite[];
  agents: AgentLite[];
  meetings: MeetingItem[];
}) {
  const [query, setQuery] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<MeetingItem | null>(null);
  const [deleting, setDeleting] = useState<MeetingItem | null>(null);
  const [detail, setDetail] = useState<MeetingItem | null>(null);
  const [addTaskTarget, setAddTaskTarget] = useState<MeetingItem | null>(null);
  const [addDecisionTarget, setAddDecisionTarget] = useState<MeetingItem | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [createState, createAction] = useActionState(createMeetingV2WithStateAction, initialState);
  const [updateState, updateAction] = useActionState(updateMeetingV2WithStateAction, initialState);
  const [deleteState, deleteAction] = useActionState(deleteMeetingV2WithStateAction, initialState);
  const [taskState, taskAction] = useActionState(addMeetingTaskV2WithStateAction, initialState);
  const [decisionState, decisionAction] = useActionState(addMeetingDecisionV2WithStateAction, initialState);

  useEffect(() => {
    const picked = [pickToast(createState), pickToast(updateState), pickToast(deleteState), pickToast(taskState), pickToast(decisionState)].find(Boolean);
    if (picked) {
      setToast(picked);
      setOpenCreate(false);
      setEditing(null);
      setDeleting(null);
      setAddTaskTarget(null);
      setAddDecisionTarget(null);
    }
  }, [createState, updateState, deleteState, taskState, decisionState]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredMeetings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter((meeting) => `${meeting.title} ${meeting.category} ${meeting.tenantLabel}`.toLowerCase().includes(q));
  }, [meetings, query]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Total reuniones: {meetings.length}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Con tareas: {meetings.filter((meeting) => meeting.tasks.length > 0).length}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Con decisiones: {meetings.filter((meeting) => meeting.decisions.length > 0).length}</div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 text-sm">Pendientes: {meetings.reduce((acc, meeting) => acc + meeting.tasks.filter((task) => !task.completed).length, 0)}</div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar reunión..." className="min-h-11 w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
        <button type="button" onClick={() => setOpenCreate(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]">
          <Plus className="h-4 w-4" />
          Nueva reunión
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Reuniones</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="px-2 py-2">Reunión</th><th className="px-2 py-2">Cliente</th><th className="px-2 py-2">Fecha</th><th className="px-2 py-2">Estado</th><th className="px-2 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeetings.map((meeting) => (
                <tr key={meeting.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-2 py-2"><p className="font-medium text-[var(--foreground)]">{meeting.title}</p><p className="text-xs text-[var(--muted)]">{meeting.category}</p></td>
                  <td className="px-2 py-2">{meeting.tenantLabel}</td>
                  <td className="px-2 py-2">{meeting.scheduledAt ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(meeting.scheduledAt)) : "Sin fecha"}</td>
                  <td className="px-2 py-2">{meeting.tasks.filter((task) => !task.completed).length > 0 ? "Con pendientes" : "Al día"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setDetail(meeting)} className="rounded-lg border border-[var(--border-subtle)] px-2 py-1"><CalendarDays className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setEditing(meeting)} className="rounded-lg border border-[var(--border-subtle)] px-2 py-1"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setDeleting(meeting)} className="rounded-lg border border-[var(--border-subtle)] px-2 py-1"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMeetings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-sm text-[var(--muted)]">
                    No hay reuniones para mostrar con los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <CrudModal open={openCreate} onClose={() => setOpenCreate(false)} title="Nueva reunión">
        <MeetingForm action={createAction} tenants={tenants} />
      </CrudModal>

      <CrudModal open={Boolean(editing)} onClose={() => setEditing(null)} title="Editar reunión">
        {editing ? <MeetingForm action={updateAction} tenants={tenants} meeting={editing} /> : null}
      </CrudModal>

      <CrudModal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Eliminar reunión">
        {deleting ? (
          <form action={deleteAction} className="grid gap-4">
            <input type="hidden" name="meetingId" value={deleting.id} />
            <p className="text-sm text-[var(--muted)]">Vas a eliminar <strong>{deleting.title}</strong>.</p>
            <button className="min-h-11 rounded-xl border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)]">Confirmar eliminación</button>
          </form>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `Reunión: ${detail.title}` : "Detalle reunión"} widthClassName="max-w-4xl">
        {detail ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 text-sm">
              <p className="font-medium text-[var(--foreground)]">{detail.tenantLabel}</p>
              <p className="text-[var(--muted)]">{detail.description ?? "Sin descripción"}</p>
              {detail.meetUrl ? <a className="text-[var(--accent-strong)] underline" href={detail.meetUrl} target="_blank" rel="noreferrer">{detail.meetUrl}</a> : null}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAddTaskTarget(detail)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs font-semibold"><CheckSquare className="h-4 w-4" />Agregar tarea</button>
              <button type="button" onClick={() => setAddDecisionTarget(detail)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 text-xs font-semibold"><Plus className="h-4 w-4" />Agregar decisión</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
                <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Tareas</p>
                {detail.tasks.length === 0 ? <p className="text-xs text-[var(--muted)]">Sin tareas.</p> : (
                  <ul className="space-y-1 text-xs text-[var(--muted)]">{detail.tasks.map((task) => <li key={task.id}>{task.completed ? "✓" : "•"} {task.title} {task.responsibleUserLabel ? `- ${task.responsibleUserLabel}` : ""}</li>)}</ul>
                )}
              </section>
              <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
                <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Decisiones</p>
                {detail.decisions.length === 0 ? <p className="text-xs text-[var(--muted)]">Sin decisiones.</p> : (
                  <ul className="space-y-1 text-xs text-[var(--muted)]">{detail.decisions.map((decision) => <li key={decision.id}>• {decision.description}</li>)}</ul>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(addTaskTarget)} onClose={() => setAddTaskTarget(null)} title="Agregar tarea de reunión">
        {addTaskTarget ? (
          <form action={taskAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="meetingId" value={addTaskTarget.id} />
            <input name="title" required placeholder="Tarea" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm md:col-span-2" />
            <select name="responsibleUserId" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"><option value="">Sin responsable</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>
            <input name="dueDate" type="date" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
            <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">Guardar tarea</button>
          </form>
        ) : null}
      </CrudModal>

      <CrudModal open={Boolean(addDecisionTarget)} onClose={() => setAddDecisionTarget(null)} title="Agregar decisión de reunión">
        {addDecisionTarget ? (
          <form action={decisionAction} className="grid gap-3">
            <input type="hidden" name="meetingId" value={addDecisionTarget.id} />
            <textarea name="description" rows={3} required placeholder="Decisión tomada..." className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm" />
            <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]">Guardar decisión</button>
          </form>
        ) : null}
      </CrudModal>

      <ActionToast toast={toast} />
    </div>
  );
}

function MeetingForm({
  action,
  tenants,
  meeting,
}: {
  action: (payload: FormData) => void;
  tenants: TenantLite[];
  meeting?: MeetingItem;
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {meeting ? <input type="hidden" name="meetingId" value={meeting.id} /> : null}
      <select name="tenantId" required defaultValue={meeting?.tenantId ?? ""} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm">
        <option value="">Seleccionar cliente/tenant</option>
        {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.accountName}</option>)}
      </select>
      <input name="title" required defaultValue={meeting?.title ?? ""} placeholder="Nombre de la reunión" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
      <input name="category" required defaultValue={meeting?.category ?? "Seguimiento"} placeholder="Categoría" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
      <input name="scheduledAt" type="datetime-local" defaultValue={meeting?.scheduledAt ? meeting.scheduledAt.slice(0, 16) : ""} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm" />
      <input name="meetUrl" type="url" defaultValue={meeting?.meetUrl ?? ""} placeholder="https://meet.google.com/..." className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm md:col-span-2" />
      <textarea name="description" rows={3} defaultValue={meeting?.description ?? ""} placeholder="Descripción" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm md:col-span-2" />
      <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] md:col-span-2">
        {meeting ? "Guardar cambios" : "Crear reunión"}
      </button>
    </form>
  );
}

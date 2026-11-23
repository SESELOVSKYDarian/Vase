"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  assignWorkspaceItemAction,
  commentWorkspaceItemAction,
  createWorkspaceTaskAction,
  moveWorkspaceItemAction,
  setWorkspacePriorityAction,
  type WorkspaceActionResult,
} from "@/app/(platform)/app/workspace/actions";
import { PRIORITIES, WORKSPACE_COLUMNS, type WorkspaceColumn, type WorkspacePriority } from "@/lib/workspace/board";

type Agent = { id: string; name: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const run = (call: () => Promise<WorkspaceActionResult>, after?: () => void) => {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await call().catch(() => ({ ok: false, message: "No pudimos guardar." }));
      if (!result.ok) setError(result.message ?? "No pudimos guardar.");
      else {
        if (result.message) setNotice(result.message);
        after?.();
        router.refresh();
      }
    });
  };
  return { pending, error, notice, run };
}

/** Panel derecho del detalle: estado, prioridad y responsable. Cada cambio se guarda solo. */
export function WorkspaceProps({
  itemKey,
  column,
  priority,
  assigneeId,
  agents,
  canAssign,
}: {
  itemKey: string;
  column: WorkspaceColumn;
  priority: WorkspacePriority;
  assigneeId: string | null;
  agents: Agent[];
  canAssign: boolean;
}) {
  const { pending, error, run } = useAction();
  return (
    <div className="vpa-card stack" aria-busy={pending}>
      <label className="wsp-prop">
        <span>Estado</span>
        <select className="vpa-inp" defaultValue={column} disabled={pending} onChange={(event) => run(() => moveWorkspaceItemAction(itemKey, event.target.value as WorkspaceColumn))}>
          {WORKSPACE_COLUMNS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="wsp-prop">
        <span>Prioridad</span>
        <select className="vpa-inp" defaultValue={priority} disabled={pending} onChange={(event) => run(() => setWorkspacePriorityAction(itemKey, event.target.value as WorkspacePriority))}>
          {PRIORITIES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="wsp-prop">
        <span>Responsable</span>
        <select
          className="vpa-inp"
          defaultValue={assigneeId ?? ""}
          disabled={pending || !canAssign}
          onChange={(event) => run(() => assignWorkspaceItemAction(itemKey, event.target.value))}
        >
          <option value="">Sin asignar</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="vpa-saveerr" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Caja para comentar. En tickets se elige si lo ve el cliente o es una nota del equipo. */
export function WorkspaceComposer({
  itemKey,
  isTicket,
  canReplyCustomer,
  whatsapp = false,
}: {
  itemKey: string;
  isTicket: boolean;
  canReplyCustomer: boolean;
  whatsapp?: boolean;
}) {
  const { pending, error, notice, run } = useAction();
  const [body, setBody] = useState("");
  const [toCustomer, setToCustomer] = useState(false);
  return (
    <form
      className="wsp-compose"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => commentWorkspaceItemAction(itemKey, body, toCustomer), () => setBody(""));
      }}
    >
      <textarea
        className="vpa-inp"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={toCustomer ? "Respuesta para el cliente…" : "Comentario para el equipo…"}
        aria-label="Comentario"
      />
      <div className="row">
        {isTicket && canReplyCustomer ? (
          <nav className="vpa-seg" aria-label="Quién lo ve">
            <button type="button" className={!toCustomer ? "on" : undefined} aria-pressed={!toCustomer} onClick={() => setToCustomer(false)}>
              Nota interna
            </button>
            <button type="button" className={toCustomer ? "on" : undefined} aria-pressed={toCustomer} onClick={() => setToCustomer(true)}>
              {whatsapp ? "Responder por WhatsApp" : "Responder al cliente"}
            </button>
          </nav>
        ) : null}
        <span style={{ flex: 1 }} />
        <button type="submit" className="vpa-btn acc" disabled={pending || body.trim().length < 2}>
          {pending ? "Enviando…" : toCustomer ? (whatsapp ? "Enviar por WhatsApp" : "Enviar al cliente") : "Comentar"}
        </button>
      </div>
      {notice ? (
        <p className="vpa-notice" role="status" style={{ margin: 0 }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="vpa-saveerr" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Botón "Nuevo trabajo" con su ventana. */
export function WorkspaceNewTask({ agents, base }: { agents: Agent[]; base: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button type="button" className="vpa-btn acc" onClick={() => setOpen(true)}>
        <Plus size={15} aria-hidden="true" />
        Nuevo trabajo
      </button>
      {open ? (
        <div className="vpa-dialog" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <form
            role="dialog"
            aria-label="Nuevo trabajo"
            style={{ width: "min(520px, 100%)", display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setError(null);
              start(async () => {
                const result = await createWorkspaceTaskAction({
                  title: String(form.get("title") ?? ""),
                  description: String(form.get("description") ?? ""),
                  priority: String(form.get("priority") ?? "MEDIUM") as WorkspacePriority,
                  assigneeId: String(form.get("assigneeId") ?? ""),
                }).catch(() => ({ ok: false, message: "No pudimos crearlo.", key: undefined }));
                if (!result.ok || !result.key) {
                  setError(result.message ?? "No pudimos crearlo.");
                  return;
                }
                setOpen(false);
                router.push(`${base}/i/${result.key}` as Route);
              });
            }}
          >
            <h3>Nuevo trabajo</h3>
            <label className="vpa-fld">
              <span>Título</span>
              <input className="vpa-inp" name="title" required autoFocus placeholder="Ej.: arreglar el checkout de la tienda X" />
            </label>
            <label className="vpa-fld">
              <span>Detalle</span>
              <textarea className="vpa-inp" name="description" rows={4} style={{ height: "auto", padding: "10px 12px" }} />
            </label>
            <div className="vpa-two">
              <label className="vpa-fld">
                <span>Prioridad</span>
                <select className="vpa-inp" name="priority" defaultValue="MEDIUM">
                  {PRIORITIES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="vpa-fld">
                <span>Responsable</span>
                <select className="vpa-inp" name="assigneeId" defaultValue="">
                  <option value="">Sin asignar</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error ? (
              <p className="vpa-saveerr" role="alert" style={{ margin: 0 }}>
                {error}
              </p>
            ) : null}
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="vpa-btn acc" disabled={pending}>
                {pending ? "Creando…" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

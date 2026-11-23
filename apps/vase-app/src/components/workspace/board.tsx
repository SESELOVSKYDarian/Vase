"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";
import { moveWorkspaceItemAction } from "@/app/(platform)/app/workspace/actions";
import { WORKSPACE_COLUMNS, initials, priorityInfo, type WorkspaceColumn } from "@/lib/workspace/board";
import type { WorkspaceItem } from "@/server/queries/workspace";

function shortDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(value)) : null;
}

/** Tablero: arrastrás una tarjeta a otra columna (o usás el selector en el celular) y cambia su estado. */
export function WorkspaceBoard({ items, base }: { items: WorkspaceItem[]; base: string }) {
  const router = useRouter();
  const [local, setLocal] = useState(items);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [over, setOver] = useState<WorkspaceColumn | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Cuando el servidor manda datos nuevos, el tablero los toma.
  useEffect(() => {
    queueMicrotask(() => setLocal(items));
  }, [items]);

  function move(key: string, column: WorkspaceColumn) {
    const item = local.find((entry) => entry.key === key);
    if (!item || item.column === column) return;
    const previous = local;
    setLocal((current) => current.map((entry) => (entry.key === key ? { ...entry, column } : entry)));
    setBusy(key);
    setError(null);
    startTransition(async () => {
      const result = await moveWorkspaceItemAction(key, column).catch(() => ({ ok: false, message: "No pudimos moverla." }));
      setBusy(null);
      if (!result.ok) {
        setLocal(previous);
        setError(result.message ?? "No pudimos moverla.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {error ? (
        <p className="vpa-saveerr" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
      <div className="wsp-board">
        {WORKSPACE_COLUMNS.map((column) => {
          const cards = local.filter((item) => item.column === column.id);
          return (
            <section
              key={column.id}
              className={`wsp-col${over === column.id ? " over" : ""}`}
              aria-label={column.label}
              onDragOver={(event) => {
                if (!dragKey) return;
                event.preventDefault();
                if (over !== column.id) setOver(column.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const key = event.dataTransfer.getData("text/plain") || dragKey;
                setOver(null);
                setDragKey(null);
                if (key) move(key, column.id);
              }}
            >
              <div className={`wsp-colh ${column.id}`}>
                <i />
                {column.label}
                <span className="n">{cards.length}</span>
              </div>
              {cards.length === 0 ? <div className="wsp-empty">Soltá una tarjeta acá</div> : null}
              {cards.map((item) => {
                const priority = priorityInfo(item.priority);
                const due = shortDate(item.dueAt);
                return (
                  <article
                    key={item.key}
                    className={`wsp-card${dragKey === item.key ? " dragging" : ""}${busy === item.key ? " busy" : ""}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", item.key);
                      event.dataTransfer.effectAllowed = "move";
                      setDragKey(item.key);
                    }}
                    onDragEnd={() => {
                      setDragKey(null);
                      setOver(null);
                    }}
                  >
                    <div className="wsp-meta">
                      <span className={`wsp-kind ${item.kind}`}>{item.kind === "ticket" ? "Ticket" : "Trabajo"}</span>
                      <span className="wsp-code">{item.code}</span>
                    </div>
                    <Link href={`${base}/i/${item.key}` as Route} style={{ color: "inherit", textDecoration: "none" }}>
                      <b>{item.title}</b>
                    </Link>
                    {item.client ? <div className="wsp-meta">{item.client}</div> : null}
                    <div className="wsp-foot">
                      <span className={`vpa-tag ${priority.tone}`}>
                        <i />
                        {priority.label}
                      </span>
                      {due ? <span className="wsp-meta">vence {due}</span> : null}
                      {item.comments > 0 ? (
                        <span className="wsp-meta" title="Comentarios">
                          <MessageSquare size={12} aria-hidden="true" /> {item.comments}
                        </span>
                      ) : null}
                      <span className="sp" />
                      <select
                        className="wsp-move"
                        aria-label={`Mover ${item.code}`}
                        value={item.column}
                        onChange={(event) => move(item.key, event.target.value as WorkspaceColumn)}
                      >
                        {WORKSPACE_COLUMNS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span className={`wsp-ava${item.assignee ? "" : " none"}`} title={item.assignee?.name ?? "Sin asignar"}>
                        {initials(item.assignee?.name) || "?"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}

import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WorkspaceComposer, WorkspaceProps } from "@/components/workspace/item-controls";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { STATUS_LABEL, initials, parseItemKey } from "@/lib/workspace/board";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { getWorkspaceItem, listWorkspaceAgents } from "@/server/queries/workspace";

export const dynamic = "force-dynamic";

function when(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

/** Detalle de un ticket o trabajo: descripción, conversación y datos a la derecha. */
export default async function WorkspaceItemPage({ params }: { params: Promise<{ key: string }> }) {
  const ctx = await getWorkspaceContext();
  const { key } = await params;
  const parsed = parseItemKey(decodeURIComponent(key));
  if (!parsed) notFound();
  const [item, agents] = await Promise.all([getWorkspaceItem(parsed.kind, parsed.id), listWorkspaceAgents()]);
  if (!item) notFound();

  const isTicket = item.kind === "ticket";
  const mineTask = !isTicket && item.assignee?.id === ctx.userId;
  const canEdit = ctx.role === "SUPER_ADMIN" || (isTicket ? ctx.role === "SUPPORT" : ctx.role === "DEVELOPER" && mineTask);
  const commentCount = item.thread.length;

  return (
    <WorkspaceShell
      base={ctx.base}
      active={null}
      title={item.title}
      subtitle={`${item.code} · ${STATUS_LABEL[item.status] ?? item.status}`}
      userName={ctx.userName}
      adminUrl={ctx.adminUrl}
      actions={
        <Link href={(ctx.base || "/") as Route} className="vpa-btn line sm">
          <ArrowLeft size={14} aria-hidden="true" />
          Tablero
        </Link>
      }
    >
      <div className="wsp-detail">
        <div className="vpa-stack">
          <section className="vpa-card stack">
            <div className="wsp-meta">
              <span className={`wsp-kind ${item.kind}`}>{isTicket ? "Ticket" : "Trabajo"}</span>
              {item.whatsapp ? <span className="vpa-tag g"><i />WhatsApp</span> : null}
              <span className="wsp-code">{item.code}</span>
              <span>· creado el {when(item.createdAt)}</span>
            </div>
            {item.description ? <p className="wsp-desc">{item.description}</p> : <p className="vpa-mut" style={{ margin: 0 }}>Sin descripción.</p>}
          </section>

          <section className="vpa-card stack" aria-label="Conversación">
            <div className="vpa-sech">
              <div className="vpa-g1">
                <h3>{isTicket ? "Conversación" : "Comentarios"}</h3>
                <p>{isTicket ? "Las respuestas en verde las ve el cliente; el resto es del equipo." : `${commentCount} ${commentCount === 1 ? "comentario" : "comentarios"}`}</p>
              </div>
            </div>
            <div className="wsp-thread">
              {item.thread.length === 0 ? <p className="vpa-mut" style={{ margin: 0 }}>Todavía no hay nada.</p> : null}
              {item.thread.map((entry) =>
                entry.visibility === "EVENT" ? (
                  <div key={entry.id} className="wsp-msg event">
                    <div className="body">
                      {entry.body} · {entry.author} · {when(entry.at)}
                    </div>
                  </div>
                ) : (
                  <div key={entry.id} className={`wsp-msg${entry.visibility === "CUSTOMER" ? " customer" : ""}`}>
                    <span className="wsp-ava">{initials(entry.author) || "V"}</span>
                    <div className="body">
                      <div className="who">
                        {entry.author}
                        <small>
                          {when(entry.at)}
                          {entry.visibility === "CUSTOMER" ? " · lo ve el cliente" : ""}
                        </small>
                      </div>
                      <p>{entry.body}</p>
                    </div>
                  </div>
                ),
              )}
            </div>
            <WorkspaceComposer itemKey={item.key} isTicket={isTicket} canReplyCustomer={ctx.role !== "DEVELOPER"} whatsapp={item.whatsapp} />
          </section>
        </div>

        <aside className="wsp-props" aria-label="Datos">
          {canEdit ? (
            <WorkspaceProps
              itemKey={item.key}
              column={item.column}
              priority={item.priority}
              assigneeId={item.assignee?.id ?? null}
              agents={agents}
              canAssign={ctx.role !== "DEVELOPER"}
            />
          ) : (
            <div className="vpa-notice">Solo lo puede cambiar {isTicket ? "soporte" : "quien lo tiene asignado"}.</div>
          )}
          <div className="vpa-card stack">
            {item.facts.map(([label, value]) => (
              <div key={label} className="wsp-prop">
                <span>{label}</span>
                <b style={{ fontWeight: 700 }}>{value}</b>
              </div>
            ))}
            {item.dueAt ? (
              <div className="wsp-prop">
                <span>Vence</span>
                <b style={{ fontWeight: 700 }}>{when(item.dueAt)}</b>
              </div>
            ) : null}
            <div className="wsp-prop">
              <span>Última actualización</span>
              <b style={{ fontWeight: 700 }}>{when(item.updatedAt)}</b>
            </div>
          </div>
        </aside>
      </div>
    </WorkspaceShell>
  );
}

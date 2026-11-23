import type { Route } from "next";
import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WORKSPACE_COLUMNS, initials, priorityInfo } from "@/lib/workspace/board";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { listWorkspaceItems } from "@/server/queries/workspace";

export const dynamic = "force-dynamic";

const COLUMN_TONE: Record<string, string> = { todo: "", doing: "b", waiting: "y", done: "g" };

/** Lista: lo mismo que el tablero, en una tabla ordenada por prioridad. */
export default async function WorkspaceListPage() {
  const ctx = await getWorkspaceContext();
  const items = await listWorkspaceItems({ scope: "all", userId: ctx.userId });
  const when = (value: string) => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(value));

  return (
    <WorkspaceShell base={ctx.base} active="lista" title="Lista" subtitle="Todo lo abierto y lo terminado en el último mes" userName={ctx.userName} adminUrl={ctx.adminUrl}>
      <section className="vpa-card" style={{ padding: "12px 20px" }}>
        {items.length === 0 ? (
          <div className="vpa-empty" style={{ margin: "8px 0" }}>No hay nada cargado.</div>
        ) : (
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Responsable</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const priority = priorityInfo(item.priority);
                  return (
                    <tr key={item.key}>
                      <td>
                        <span className={`wsp-kind ${item.kind}`}>{item.kind === "ticket" ? "Ticket" : "Trabajo"}</span> <span className="wsp-code">{item.code}</span>
                      </td>
                      <td className="wrap">
                        <Link href={`${ctx.base}/i/${item.key}` as Route} style={{ color: "inherit" }}>
                          <b>{item.title}</b>
                        </Link>
                        {item.client ? <span className="sub">{item.client}</span> : null}
                      </td>
                      <td>
                        <span className={`vpa-tag ${COLUMN_TONE[item.column]}`}>
                          <i />
                          {WORKSPACE_COLUMNS.find((column) => column.id === item.column)?.label} · {item.statusLabel}
                        </span>
                      </td>
                      <td>
                        <span className={`vpa-tag ${priority.tone}`}>
                          <i />
                          {priority.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span className={`wsp-ava${item.assignee ? "" : " none"}`}>{initials(item.assignee?.name) || "?"}</span>
                          <span className="vpa-mut">{item.assignee?.name ?? "Sin asignar"}</span>
                        </span>
                      </td>
                      <td className="vpa-mut">{when(item.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}

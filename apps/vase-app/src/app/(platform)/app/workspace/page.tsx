import { Search } from "lucide-react";
import { WorkspaceBoard } from "@/components/workspace/board";
import { WorkspaceNewTask } from "@/components/workspace/item-controls";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { listWorkspaceAgents, listWorkspaceItems, type WorkspaceScope } from "@/server/queries/workspace";

export const dynamic = "force-dynamic";

const VIEWS: Array<{ id: WorkspaceScope; label: string; param: string }> = [
  { id: "all", label: "Todo", param: "" },
  { id: "tickets", label: "Tickets", param: "tickets" },
  { id: "tasks", label: "Trabajos", param: "trabajos" },
  { id: "mine", label: "Lo mío", param: "mios" },
];

/** workspace.vase.ar: tablero con los tickets de soporte y los trabajos del equipo. */
export default async function WorkspaceBoardPage({ searchParams }: { searchParams: Promise<{ ver?: string; q?: string }> }) {
  const ctx = await getWorkspaceContext();
  const params = await searchParams;
  const view = VIEWS.find((item) => item.param === (params.ver ?? "")) ?? VIEWS[0];
  const q = (params.q ?? "").trim().slice(0, 80);
  const [items, agents] = await Promise.all([listWorkspaceItems({ scope: view.id, q, userId: ctx.userId }), listWorkspaceAgents()]);
  const open = items.filter((item) => item.column !== "done").length;

  const viewHref = (param: string) => {
    const next = new URLSearchParams();
    if (param) next.set("ver", param);
    if (q) next.set("q", q);
    const text = next.toString();
    return `${ctx.base || "/"}${text ? `?${text}` : ""}`;
  };

  return (
    <WorkspaceShell
      base={ctx.base}
      active={view.id === "mine" ? "mios" : "tablero"}
      title="Tablero"
      subtitle={`${open} ${open === 1 ? "abierto" : "abiertos"} · tickets y trabajos del equipo`}
      userName={ctx.userName}
      adminUrl={ctx.adminUrl}
    >
      <div className="wsp-bar">
        <form className="vpa-search" action={ctx.base || "/"} role="search">
          <Search size={16} aria-hidden="true" />
          <input className="vpa-inp" type="search" name="q" defaultValue={q} placeholder="Buscar por título o cliente" aria-label="Buscar" />
          {view.param ? <input type="hidden" name="ver" value={view.param} /> : null}
        </form>
        <nav className="vpa-seg" aria-label="Qué mostrar">
          {VIEWS.map((item) => (
            <a key={item.id} href={viewHref(item.param)} className={item.id === view.id ? "on" : undefined} aria-current={item.id === view.id ? "page" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <span style={{ flex: 1 }} />
        {ctx.role !== "DEVELOPER" ? <WorkspaceNewTask agents={agents} base={ctx.base} /> : null}
      </div>
      <WorkspaceBoard items={items} base={ctx.base} />
    </WorkspaceShell>
  );
}

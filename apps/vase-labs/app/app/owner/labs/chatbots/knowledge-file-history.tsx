"use client";

import { History, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Version = { id: string | null; label: string; revision: number; createdAt: string; active: boolean; before: string | null; after: string | null; instruction: string | null };

export function KnowledgeFileHistory({ itemId, title }: { itemId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | "original">();
  const [error, setError] = useState("");
  const close = useCallback(() => { if (!restoring) setOpen(false); }, [restoring]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [close, open]);

  async function load() {
    setOpen(true); setLoading(true); setError("");
    try {
      const response = await fetch(`/api/labs/knowledge/files/${encodeURIComponent(itemId)}/history`);
      if (!response.ok) throw new Error("history");
      const payload = await response.json() as { versions?: Version[] };
      setVersions(payload.versions ?? []);
    } catch { setError("No pudimos cargar el historial del archivo."); }
    finally { setLoading(false); }
  }

  async function restore(version: Version) {
    if (!window.confirm(`¿Restaurar ${version.label} de ${title}? Se creará una nueva revisión.`)) return;
    setRestoring(version.id ?? "original"); setError("");
    try {
      const response = await fetch(`/api/labs/knowledge/files/${encodeURIComponent(itemId)}/restore`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revisionId: version.id }) });
      if (!response.ok) throw new Error("restore");
      await load(); router.refresh();
    } catch { setError("No pudimos restaurar esta versión."); }
    finally { setRestoring(undefined); }
  }

  return <>
    <button type="button" onClick={() => void load()} aria-label={`Ver historial de ${title}`}><History aria-hidden="true" /><span>Historial</span></button>
    {open ? <div className="labs-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="labs-file-history-drawer" role="dialog" aria-modal="true" aria-labelledby="file-history-title">
        <header><div><p className="labs-modal-kicker">Historial de archivo</p><h2 id="file-history-title">{title}</h2></div><button type="button" className="labs-icon-button" onClick={close} aria-label="Cerrar historial"><X /></button></header>
        <div className="labs-file-history-body">
          {loading ? <p role="status">Cargando versiones…</p> : null}
          {error ? <p className="labs-modal-error" role="alert">{error}</p> : null}
          {!loading && !versions.length && !error ? <p>No hay versiones registradas.</p> : null}
          {versions.map((version) => <article key={version.id ?? "original"} className={version.active ? "is-active" : ""}>
            <div><strong>{version.label}</strong>{version.active ? <span>Activa</span> : null}<small>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(version.createdAt))}</small></div>
            {version.instruction ? <p><b>Instrucción:</b> {version.instruction}</p> : null}
            {version.before ? <details><summary>Contenido anterior</summary><pre>{version.before}</pre></details> : null}
            {version.after ? <details><summary>Contenido de esta versión</summary><pre>{version.after}</pre></details> : null}
            {!version.active ? <button type="button" className="labs-button-secondary" disabled={Boolean(restoring)} onClick={() => void restore(version)}><RotateCcw /> Restaurar esta versión</button> : null}
          </article>)}
        </div>
      </section>
    </div> : null}
  </>;
}

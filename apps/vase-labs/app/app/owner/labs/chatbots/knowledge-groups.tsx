"use client";

import { AlertTriangle, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KnowledgeSourceType } from "../../../../lib/knowledge-source";
import { KnowledgeFileHistory } from "./knowledge-file-history";

type Item = { id: string; title: string; status: string; updatedAt: Date };
type KnowledgeGroupType = KnowledgeSourceType | "OTROS";
type Group = { type: KnowledgeGroupType; items: Item[] };
type Selection = { action: "edit" | "delete"; item: Item; groupType: KnowledgeGroupType };

const labels: Record<KnowledgeGroupType, string> = {
  FILE: "Documentos y archivos",
  URL: "URLs",
  FAQ: "Preguntas frecuentes",
  VASE_MANAGEMENT: "Vase Management",
  EXTERNAL_MANAGEMENT: "Sistema de gestión externo",
  OTROS: "Otros",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export function KnowledgeGroups({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string>();
  const dialogRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const deleteHeadingRef = useRef<HTMLHeadingElement>(null);
  const busyStatusRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback((force = false, focusTarget: "opener" | "page" = "opener") => {
    if (submitting && !force) return;
    setSelection(undefined);
    setTitle("");
    setError("");
    requestAnimationFrame(() => {
      if (focusTarget === "page") {
        requestAnimationFrame(() => document.getElementById("knowledge-sources-focus-target")?.focus());
      } else openerRef.current?.focus();
    });
  }, [submitting]);

  useEffect(() => {
    if (!selection) return;
    requestAnimationFrame(() => {
      if (selection.action === "edit") editInputRef.current?.focus();
      else deleteHeadingRef.current?.focus();
    });
  }, [selection]);

  useEffect(() => {
    if (submitting) requestAnimationFrame(() => busyStatusRef.current?.focus());
  }, [submitting]);

  useEffect(() => {
    if (error && !submitting) requestAnimationFrame(() => errorRef.current?.focus());
  }, [error, submitting]);

  useEffect(() => {
    if (!selection) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [close, selection]);

  function open(action: Selection["action"], item: Item, groupType: KnowledgeGroupType, trigger: HTMLButtonElement) {
    openerRef.current = trigger;
    setSelection({ action, item, groupType });
    setTitle(item.title);
    setError("");
  }

  function trapFocus(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    if (submitting) {
      event.preventDefault();
      busyStatusRef.current?.focus();
      return;
    }
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function rename(event: React.FormEvent) {
    event.preventDefault();
    if (!selection || selection.action !== "edit" || submitting) return;
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Ingresá un nombre para la fuente.");
      editInputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/labs/knowledge/${encodeURIComponent(selection.item.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      if (!response.ok) throw new Error("rename");
      router.refresh();
      close(true);
    } catch {
      setError("No pudimos guardar los cambios. Intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!selection || selection.action !== "delete" || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/labs/knowledge/${encodeURIComponent(selection.item.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete");
      router.refresh();
      close(true, "page");
    } catch {
      setError("No pudimos eliminar la fuente. Intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryFileProcessing(item: Item) {
    if (retryingId) return;
    setRetryingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/labs/knowledge/files/${encodeURIComponent(item.id)}/process`, { method: "POST" });
      if (!response.ok) throw new Error("process");
      router.refresh();
    } catch {
      setError("No pudimos reprocesar el archivo. Intentá nuevamente.");
    } finally {
      setRetryingId(undefined);
    }
  }

  const STATE: Record<string, { label: string; cls: string }> = {
    READY: { label: "Listo", cls: "g" },
    FAILED: { label: "Con error", cls: "r" },
    QUEUED: { label: "En cola", cls: "y" },
    PROCESSING: { label: "Leyendo…", cls: "y" },
  };
  const ext = (item: Item, type: KnowledgeGroupType) => {
    if (type === "URL") return "web";
    if (type === "FAQ") return "faq";
    const match = /\.([a-z0-9]{2,4})$/i.exec(item.title);
    return match ? match[1] : "doc";
  };

  return <>
    {groups.map((group) => (
      <section key={group.type} className="vpa-card" aria-labelledby={`knowledge-${group.type}`}>
        <div className="vpa-sech">
          <div className="vpa-g1">
            <h3 id={`knowledge-${group.type}`}>{labels[group.type]}</h3>
            <p>{group.items.length} {group.items.length === 1 ? "fuente" : "fuentes"} · {group.items.filter((item) => item.status === "READY").length} listas para responder</p>
          </div>
        </div>
        {group.items.map((item) => {
          const state = STATE[item.status] ?? { label: item.status, cls: "" };
          return (
            <div key={item.id} className="lx-srow">
              <span className="lx-fic" aria-hidden="true">{ext(item, group.type)}</span>
              <div className="vpa-g1">
                <b>{item.title}</b>
                <span>Actualizado {dateFormatter.format(item.updatedAt)}</span>
              </div>
              <span className={`vpa-tag ${state.cls}`}><i />{state.label}</span>
              <div className="lx-srow-acts" role="group" aria-label={`Acciones para ${item.title}`}>
                {group.type === "FILE" ? <KnowledgeFileHistory itemId={item.id} title={item.title} /> : null}
                {group.type === "FILE" && item.status === "FAILED" ? (
                  <button type="button" className="vpa-btn line sm" onClick={() => void retryFileProcessing(item)} disabled={Boolean(retryingId)} aria-label={`Reintentar procesamiento de ${item.title}`}>
                    <RefreshCw size={14} aria-hidden="true" />{retryingId === item.id ? "Reintentando…" : "Reintentar"}
                  </button>
                ) : null}
                <button type="button" className="vpa-ib sm" onClick={(event) => open("edit", item, group.type, event.currentTarget)} aria-label={`Editar ${item.title}`} title="Cambiar el nombre">
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button type="button" className="vpa-ib sm danger" onClick={(event) => open("delete", item, group.type, event.currentTarget)} aria-label={`Eliminar ${item.title}`} title="Eliminar">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </section>
    ))}

    {error && !selection ? <p className="lx-err" role="alert">{error}</p> : null}

    {selection ? (
      <div className="vpa-dialog" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div ref={dialogRef} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-labelledby="knowledge-source-dialog-title" aria-describedby="knowledge-source-dialog-description" style={{ width: 480 }}>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div>
              <h3 id="knowledge-source-dialog-title" ref={selection.action === "delete" ? deleteHeadingRef : undefined} tabIndex={selection.action === "delete" ? -1 : undefined}>
                {selection.action === "edit" ? "Editar fuente" : "¿Eliminar esta fuente?"}
              </h3>
              <p id="knowledge-source-dialog-description">
                {selection.action === "edit" ? "Cambiá el nombre con el que la reconocés en Labs." : "Tu asistente deja de usarla. Esta acción no se puede deshacer."}
              </p>
            </div>
            <button type="button" className="vpa-x" aria-label="Cerrar" onClick={() => close()} disabled={submitting}><X aria-hidden="true" size={18} /></button>
          </div>

          {submitting ? (
            <p ref={busyStatusRef} role="status" aria-live="polite" tabIndex={-1} className="vpa-mut">
              {selection.action === "edit" ? "Guardando cambios…" : "Eliminando fuente…"}
            </p>
          ) : null}

          {selection.action === "edit" ? (
            <form onSubmit={rename} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label className="vpa-fld">
                <span>Nombre de la fuente</span>
                <input ref={editInputRef} id="knowledge-source-title" className="vpa-inp" required maxLength={160} value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "knowledge-source-error" : undefined} disabled={submitting} />
              </label>
              {error ? <p ref={errorRef} id="knowledge-source-error" className="lx-err" role="alert" tabIndex={-1}>{error}</p> : null}
              <div className="row">
                <button type="button" className="vpa-btn soft" onClick={() => close()} disabled={submitting}>Cancelar</button>
                <button type="submit" className="vpa-btn acc" disabled={submitting}>{submitting ? "Guardando…" : "Guardar cambios"}</button>
              </div>
            </form>
          ) : (
            <>
              <div className="vpa-hrow">
                <AlertTriangle size={18} aria-hidden="true" style={{ color: "var(--warn)" }} />
                <div className="vpa-g1"><b>{selection.item.title}</b></div>
              </div>
              {selection.groupType === "EXTERNAL_MANAGEMENT" ? <p className="vpa-mut" style={{ fontSize: 12.5 }}>Si es la última fuente externa, también se borran los productos y el historial de sincronización del catálogo en Labs. Tus productos en Vase Business no cambian.</p> : null}
              {error ? <p ref={errorRef} id="knowledge-source-error" className="lx-err" role="alert" tabIndex={-1}>{error}</p> : null}
              <div className="row">
                <button type="button" className="vpa-btn soft" onClick={() => close()} disabled={submitting}>Cancelar</button>
                <button type="button" className="vpa-btn red" onClick={() => void remove()} disabled={submitting}>{submitting ? "Eliminando…" : "Sí, eliminar fuente"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    ) : null}
  </>;
}

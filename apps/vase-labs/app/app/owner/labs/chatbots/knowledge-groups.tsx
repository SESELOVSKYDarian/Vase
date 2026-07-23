"use client";

import { AlertTriangle, FileText, HelpCircle, Link2, Pencil, Store, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KnowledgeSourceType } from "../../../../lib/knowledge-source";
import { LabsStatusPill } from "../labs-ui";

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

const icons: Record<KnowledgeGroupType, typeof FileText> = {
  FILE: FileText,
  URL: Link2,
  FAQ: HelpCircle,
  VASE_MANAGEMENT: Store,
  EXTERNAL_MANAGEMENT: Store,
  OTROS: FileText,
};

function tone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "READY") return "success";
  if (status === "FAILED") return "danger";
  if (status === "QUEUED" || status === "PROCESSING") return "warning";
  return "neutral";
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export function KnowledgeGroups({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  return <>
    <div className="labs-knowledge-groups space-y-6">{groups.map((group) => (
      <section key={group.type} aria-labelledby={`knowledge-${group.type}`}>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 id={`knowledge-${group.type}`} className="text-sm font-semibold text-[var(--foreground)]">{labels[group.type]}</h3>
          <span className="text-xs text-[var(--muted)]">{group.items.length} {group.items.length === 1 ? "fuente" : "fuentes"}</span>
        </div>
        <div className="labs-knowledge-source-list">{group.items.map((item) => {
          const Icon = icons[group.type];
          return (
            <article key={item.id} className="labs-knowledge-source-row">
              <span><Icon aria-hidden="true" /></span>
              <div className="labs-knowledge-source-copy">
                <p>{item.title}</p>
                <small>Actualizado {dateFormatter.format(item.updatedAt)}</small>
              </div>
              <div className="labs-knowledge-source-status"><LabsStatusPill label={item.status} tone={tone(item.status)} /></div>
              <div className="labs-knowledge-source-actions" role="group" aria-label={`Acciones para ${item.title}`}>
                <button type="button" onClick={(event) => open("edit", item, group.type, event.currentTarget)} aria-label={`Editar ${item.title}`}>
                  <Pencil aria-hidden="true" /><span>Editar</span>
                </button>
                <button type="button" className="is-danger" onClick={(event) => open("delete", item, group.type, event.currentTarget)} aria-label={`Eliminar ${item.title}`}>
                  <Trash2 aria-hidden="true" /><span>Eliminar</span>
                </button>
              </div>
            </article>
          );
        })}</div>
      </section>
    ))}</div>

    {selection ? <div className="labs-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-labelledby="knowledge-source-dialog-title" aria-describedby="knowledge-source-dialog-description" className={`labs-knowledge-modal labs-source-management-modal${selection.action === "delete" ? " is-destructive" : ""}`}>
        <header className="labs-modal-header">
          <div>
            <p className="labs-modal-kicker">Fuente de conocimiento</p>
            <h2 id="knowledge-source-dialog-title" ref={selection.action === "delete" ? deleteHeadingRef : undefined} tabIndex={selection.action === "delete" ? -1 : undefined}>
              {selection.action === "edit" ? "Editar fuente" : "¿Eliminar esta fuente?"}
            </h2>
          </div>
          <button type="button" className="labs-icon-button" aria-label="Cerrar" onClick={() => close()} disabled={submitting}><X aria-hidden="true" size={19} /></button>
        </header>

        {submitting ? <p ref={busyStatusRef} role="status" aria-live="polite" tabIndex={-1} className="labs-source-operation-status">
          {selection.action === "edit" ? "Guardando cambios…" : "Eliminando fuente…"}
        </p> : null}

        {selection.action === "edit" ? <form className="labs-source-management-body" onSubmit={rename}>
          <p id="knowledge-source-dialog-description">Cambiá el nombre con el que identificás esta fuente en Labs.</p>
          <label htmlFor="knowledge-source-title">Nombre de la fuente</label>
          <input ref={editInputRef} id="knowledge-source-title" required maxLength={160} value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "knowledge-source-error" : undefined} disabled={submitting} />
          {error ? <p ref={errorRef} id="knowledge-source-error" className="labs-modal-error" role="alert" tabIndex={-1}>{error}</p> : null}
          <footer className="labs-modal-actions">
            <button type="button" className="labs-button-secondary" onClick={() => close()} disabled={submitting}>Cancelar</button>
            <button type="submit" className="labs-button-primary" disabled={submitting}>{submitting ? "Guardando…" : "Guardar cambios"}</button>
          </footer>
        </form> : <div className="labs-source-management-body">
          <div className="labs-source-delete-summary">
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>{selection.item.title}</strong>
              <p id="knowledge-source-dialog-description">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          {selection.groupType === "EXTERNAL_MANAGEMENT" ? <p className="labs-source-delete-warning">Si es la última fuente externa del tenant, también se eliminarán los productos y el historial de sincronización del catálogo en Labs. Tus productos en Vase Business no se modificarán.</p> : null}
          {error ? <p ref={errorRef} id="knowledge-source-error" className="labs-modal-error" role="alert" tabIndex={-1}>{error}</p> : null}
          <footer className="labs-modal-actions">
            <button type="button" className="labs-button-secondary" onClick={() => close()} disabled={submitting}>Cancelar</button>
            <button type="button" className="labs-button-danger" onClick={() => void remove()} disabled={submitting}>{submitting ? "Eliminando…" : "Sí, eliminar fuente"}</button>
          </footer>
        </div>}
      </div>
    </div> : null}
  </>;
}

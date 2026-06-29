"use client";

import { useActionState } from "react";
import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { FileText, Loader2, Trash2 } from "lucide-react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { deleteLabsKnowledgeFileAction } from "@/app/(platform)/app/owner/labs/actions";

type KnowledgeFileRow = {
  id: string;
  title: string;
  fileName: string | null;
  status: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDisplayName(item: KnowledgeFileRow) {
  return item.fileName || item.title;
}

function getStatusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "READY":
      return "success";
    case "FAILED":
      return "danger";
    case "PROCESSING":
    case "QUEUED":
      return "warning";
    default:
      return "neutral";
  }
}

function getStatusClasses(tone: ReturnType<typeof getStatusTone>) {
  switch (tone) {
    case "success":
      return "border-[color-mix(in_srgb,var(--success)_22%,transparent)] bg-[var(--success-soft)] text-[var(--success)]";
    case "warning":
      return "border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[var(--warning-soft)] text-[var(--warning)]";
    case "danger":
      return "border-[color-mix(in_srgb,var(--danger)_22%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]";
    default:
      return "border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--muted)]";
  }
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--danger)_26%,var(--border-subtle))] text-[var(--danger)] transition hover:bg-[var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Eliminar documento"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}

function KnowledgeFileCard({ item }: { item: KnowledgeFileRow }) {
  const [state, formAction] = useActionState(deleteLabsKnowledgeFileAction, {} as LabsActionState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const ok = window.confirm(
      `Esta accion eliminara "${getDisplayName(item)}" y no se puede deshacer. Quieres continuar?`,
    );

    if (!ok) {
      event.preventDefault();
    }
  }

  return (
    <article className="labs-subpanel overflow-hidden p-4 transition-colors hover:bg-[var(--surface-strong)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--foreground)]" title={getDisplayName(item)}>
              {getDisplayName(item)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {item.mimeType ?? "tipo desconocido"} - {formatBytes(item.fileSizeBytes)}
            </p>
          </div>
        </div>

        <span
          className={[
            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
            getStatusClasses(getStatusTone(item.status)),
          ].join(" ")}
        >
          {item.status}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-[var(--muted)]">
        <p>Actualizado: {formatDate(item.updatedAt)}</p>
        <p>Creado: {formatDate(item.createdAt)}</p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <input type="hidden" name="knowledgeItemId" value={item.id} />
        <div className="flex justify-end">
          <DeleteButton />
        </div>
        {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
        {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
      </form>
    </article>
  );
}

export function KnowledgeFilesList({ files }: { files: KnowledgeFileRow[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm leading-7 text-[var(--muted)]">
        Aun no hay archivos cargados.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {files.map((item) => (
        <KnowledgeFileCard key={item.id} item={item} />
      ))}
    </div>
  );
}

"use client";

import { useActionState, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Loader2, Sparkles, UploadCloud } from "lucide-react";
import type { LabsActionState } from "@/app/(platform)/app/owner/labs/actions";
import { uploadLabsKnowledgeFileAction } from "@/app/(platform)/app/owner/labs/actions";

const initialState: LabsActionState = {};
const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.webp";

export function KnowledgeFileForm() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(uploadLabsKnowledgeFileAction, initialState);

  function syncSelectedFile(file: File | null | undefined) {
    setSelectedFileName(file ? file.name : null);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    syncSelectedFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];
    if (!file || !inputRef.current) {
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputRef.current.files = dataTransfer.files;
    syncSelectedFile(file);
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={[
          "rounded-[2rem] border border-dashed p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] transition-all duration-300",
          dragActive
            ? "border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent-soft)_72%,white)]"
            : "border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_88%,white)]",
        ].join(" ")}
      >
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            {pending ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Carga documental</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Seleccionar archivo o arrastrarlo
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Subi PDFs, PNG, JPG o WEBP para entrenar al asistente con documentos reales de tu empresa.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] px-3 py-1.5 text-[var(--foreground)]">
                <Sparkles className="size-3.5 text-[var(--accent-strong)]" />
                Entrenamiento asistido
              </span>
              <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] px-3 py-1.5 text-[var(--muted)]">
                {selectedFileName ?? "Ningun archivo seleccionado"}
              </span>
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          name="file"
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          className="sr-only"
          onChange={handleInputChange}
        />

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--background)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-strong)]"
          >
            <UploadCloud className="size-4" />
            Elegir archivo
          </button>
          <button
            type="submit"
            disabled={pending || !selectedFileName}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(0,109,67,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Subiendo..." : "Subir archivo"}
          </button>
        </div>
      </div>

      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}

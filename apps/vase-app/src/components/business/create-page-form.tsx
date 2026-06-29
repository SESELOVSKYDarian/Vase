"use client";

import { useActionState, useState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { createStorefrontPageAction } from "@/app/(platform)/app/owner/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function CreatePageForm({ canCreate }: { canCreate: boolean }) {
  const [state, formAction] = useActionState(createStorefrontPageAction, initialState);
  const [pageMode, setPageMode] = useState<"STANDARD" | "TEMPORARY">("STANDARD");

  return (
    <form action={formAction} className="grid gap-4">
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="pageName">
            Nombre de la pagina
          </label>
          <input
            id="pageName"
            name="name"
            type="text"
            required
            disabled={!canCreate}
            className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
          <FieldError message={state.fieldErrors?.name?.[0]} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="pageDescription">
            Descripcion breve
          </label>
          <input
            id="pageDescription"
            name="description"
            type="text"
            disabled={!canCreate}
            className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          />
          <FieldError message={state.fieldErrors?.description?.[0]} />
        </div>
      </div>
      <input type="hidden" name="pageMode" value={pageMode} />
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!canCreate}
          onClick={() => setPageMode("STANDARD")}
          className={`rounded-3xl border p-4 text-left ${
            pageMode === "STANDARD" ? "border-[#8C735A] bg-[#F4ECE2]" : "border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)]"
          }`}
        >
          <p className="font-semibold text-[var(--foreground)]">Pagina estable</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Ideal para una pagina permanente ligada al negocio.
          </p>
        </button>
        <button
          type="button"
          disabled={!canCreate}
          onClick={() => setPageMode("TEMPORARY")}
          className={`rounded-3xl border p-4 text-left ${
            pageMode === "TEMPORARY"
              ? "border-[#8C735A] bg-[#F4ECE2]"
              : "border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)]"
          }`}
        >
          <p className="font-semibold text-[var(--foreground)]">Pagina temporal 30 dias</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Pensada para pruebas, campanas o lanzamientos cortos.
          </p>
        </button>
      </div>
      <SubmitButton
        pendingLabel="Creando pagina..."
        className="min-h-12 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
      >
        Crear nueva pagina
      </SubmitButton>
    </form>
  );
}

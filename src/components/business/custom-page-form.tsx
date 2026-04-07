"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { requestCustomPageAction } from "@/app/(platform)/app/owner/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function CustomPageRequestForm() {
  const [state, formAction] = useActionState(requestCustomPageAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="businessObjective">
          Objetivo del negocio
        </label>
        <textarea
          id="businessObjective"
          name="businessObjective"
          rows={3}
          className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.businessObjective?.[0]} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="businessDescription">
          Descripcion del negocio
        </label>
        <textarea
          id="businessDescription"
          name="businessDescription"
          rows={4}
          className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.businessDescription?.[0]} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="pageScope">
          Que pagina o experiencia necesitas
        </label>
        <textarea
          id="pageScope"
          name="pageScope"
          rows={3}
          className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.pageScope?.[0]} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="desiredColors">
            Colores deseados
          </label>
          <textarea
            id="desiredColors"
            name="desiredColors"
            rows={3}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={state.fieldErrors?.desiredColors?.[0]} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="brandStyle">
            Estilo de marca
          </label>
          <textarea
            id="brandStyle"
            name="brandStyle"
            rows={3}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={state.fieldErrors?.brandStyle?.[0]} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="desiredFeatures">
          Funcionalidades deseadas
        </label>
        <textarea
          id="desiredFeatures"
          name="desiredFeatures"
          rows={4}
          className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.desiredFeatures?.[0]} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="visualReferences">
            Referencias visuales
          </label>
          <textarea
            id="visualReferences"
            name="visualReferences"
            rows={3}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={state.fieldErrors?.visualReferences?.[0]} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="designReferences">
            Referencias de diseno
          </label>
          <textarea
            id="designReferences"
            name="designReferences"
            rows={3}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={state.fieldErrors?.designReferences?.[0]} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="requiredIntegrations">
            Integraciones necesarias
          </label>
          <textarea
            id="requiredIntegrations"
            name="requiredIntegrations"
            rows={3}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={state.fieldErrors?.requiredIntegrations?.[0]} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="observations">
            Observaciones
          </label>
          <textarea
            id="observations"
            name="observations"
            rows={3}
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
          />
          <FieldError message={state.fieldErrors?.observations?.[0]} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="notes">
          Detalles adicionales
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.notes?.[0]} />
      </div>
      <SubmitButton
        pendingLabel="Enviando solicitud..."
        className="min-h-12 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
      >
        Solicitar pagina personalizada
      </SubmitButton>
    </form>
  );
}

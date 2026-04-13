"use client";

import { useActionState } from "react";
import {
  type AdminGovernanceActionState,
  createPlatformUpdateAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

export function AdminPlatformUpdateForm() {
  const [state, formAction] = useActionState(createPlatformUpdateAction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)]/75 p-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Nuevo anuncio de plataforma</h3>
        <p className="text-sm text-[var(--muted)]">Esto aparecerá en el dropdown de notificaciones para todos los usuarios.</p>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Título</span>
        <input
          name="title"
          required
          placeholder="Ej: Actualización del módulo Business"
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)] placeholder:text-[var(--muted-soft)]"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Descripción</span>
        <textarea
          name="description"
          required
          rows={3}
          placeholder="Explica qué cambió o qué hay de nuevo..."
          className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-soft)]"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Enlace (opcional)</span>
          <input
            name="href"
            placeholder="/app/business"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)] placeholder:text-[var(--muted-soft)]"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Categoría</span>
          <select
            name="category"
            defaultValue="platform"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="platform">Plataforma</option>
            <option value="business">Business</option>
            <option value="labs">Labs</option>
            <option value="billing">Facturación</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Tono</span>
          <select
            name="tone"
            defaultValue="info"
            className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          >
            <option value="info">Información (Info)</option>
            <option value="warning">Aviso (Warning)</option>
            <option value="danger">Crítico (Danger)</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-sm text-[var(--foreground)] mt-6 md:mt-0">
          <input name="isActive" type="checkbox" defaultChecked />
          <span>Publicar inmediatamente</span>
        </label>
      </div>

      <button
        type="submit"
        className="mt-2 min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90 active:scale-[0.98]"
      >
        Publicar anuncio
      </button>

      {state.error ? (
        <p className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}

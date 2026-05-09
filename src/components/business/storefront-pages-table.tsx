"use client";

import type { FormEvent } from "react";
import { useActionState, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import type { AuthActionState } from "@/app/(auth)/actions";
import { deleteStorefrontPagesAction } from "@/app/(platform)/app/owner/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { StatusBadge } from "@/components/business/status-badge";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";

type StorefrontPageRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  statusTone: "neutral" | "success" | "warning" | "danger";
  isTemporary: boolean;
  lifecycleLabel: string;
  domains: string[];
};

const initialState: AuthActionState = {};

export function StorefrontPagesTable({ pages }: { pages: StorefrontPageRow[] }) {
  const [state, formAction, pending] = useActionState(deleteStorefrontPagesAction, initialState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pageIdSet = useMemo(() => new Set(pages.map((page) => page.id)), [pages]);
  const selectedVisibleIds = useMemo(
    () => selectedIds.filter((id) => pageIdSet.has(id)),
    [selectedIds, pageIdSet],
  );
  const selectedIdSet = useMemo(() => new Set(selectedVisibleIds), [selectedVisibleIds]);
  const selectedCount = selectedVisibleIds.length;
  const allSelected = pages.length > 0 && selectedCount === pages.length;

  function togglePage(pageId: string) {
    setSelectedIds((current) =>
      current.includes(pageId) ? current.filter((id) => id !== pageId) : [...current, pageId],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : pages.map((page) => page.id));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (selectedCount === 0) {
      event.preventDefault();
      return;
    }

    const message =
      selectedCount === 1
        ? "Esta accion eliminara la pagina seleccionada. Quieres continuar?"
        : `Esta accion eliminara ${selectedCount} paginas seleccionadas. Quieres continuar?`;
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  }

  if (pages.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[var(--border-subtle)] bg-white p-8 text-sm leading-7 text-[var(--muted)]">
        Aun no tienes paginas creadas. Usa la seccion siguiente para generar la primera.
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />

      <div className="overflow-hidden rounded-[30px] border border-[var(--border-subtle)] bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[color-mix(in_srgb,var(--surface-strong)_60%,white)] text-[var(--muted-soft)]">
              <th className="w-14 px-4 py-5 text-center text-xs font-semibold uppercase tracking-[0.2em]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todas las paginas"
                  className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)]"
                />
              </th>
              <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.2em]">
                Nombre de pagina
              </th>
              <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-[0.2em]">
                Estado
              </th>
              <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-[0.2em]">
                Dominio
              </th>
              <th className="px-6 py-5 text-xs font-semibold uppercase tracking-[0.2em]">
                Operacion
              </th>
              <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-[0.2em]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {pages.map((page) => (
              <tr
                key={page.id}
                className="group transition hover:bg-[color-mix(in_srgb,var(--surface)_96%,white)]"
              >
                <td className="px-4 py-6 text-center align-middle">
                  <input
                    type="checkbox"
                    name="pageIds"
                    value={page.id}
                    checked={selectedIdSet.has(page.id)}
                    onChange={() => togglePage(page.id)}
                    aria-label={`Seleccionar pagina ${page.name}`}
                    className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)]"
                  />
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_84%,white)] text-sm font-semibold text-[var(--foreground)]">
                      {page.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-serif text-xl text-[var(--foreground)]">{page.name}</p>
                      <p className="text-xs text-[var(--muted)]">/{page.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <div className="inline-flex justify-center">
                    <StatusBadge tone={page.statusTone} label={page.status} />
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  {page.domains.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-[var(--foreground)]">{page.domains[0]}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {page.domains.length > 1
                          ? `+${page.domains.length - 1} dominio(s)`
                          : "Dominio principal"}
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex min-h-8 items-center rounded-full bg-[color-mix(in_srgb,var(--surface-strong)_68%,white)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Sin dominio
                    </span>
                  )}
                </td>
                <td className="px-6 py-6">
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    {page.isTemporary ? "Sitio temporal" : "Sitio estable"}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{page.lifecycleLabel}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-end gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                    <Link
                      href={`/app/owner/integrations/api?site=${page.id}` as Route}
                      className="inline-flex min-h-10 items-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]"
                    >
                      Conexion
                    </Link>
                    <Link
                      href={BUSINESS_LAUNCH_PATH as Route}
                      className="inline-flex min-h-10 items-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
                    >
                      Administrar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_38%,white)] px-8 py-5 md:flex-row md:items-center md:justify-between">
          <span className="text-xs font-medium text-[var(--muted)]">
            {selectedCount > 0
              ? `${selectedCount} pagina${selectedCount === 1 ? "" : "s"} seleccionada${selectedCount === 1 ? "" : "s"}`
              : `Mostrando ${pages.length} pagina${pages.length === 1 ? "" : "s"} activas en este tenant`}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || selectedCount === 0}
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Eliminando..." : "Eliminar seleccionadas"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

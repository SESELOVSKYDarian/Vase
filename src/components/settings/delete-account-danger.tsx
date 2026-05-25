"use client";

import { useState, useTransition } from "react";
import { TriangleAlert, X } from "lucide-react";
import { deleteTenantAccountAction } from "@/app/(platform)/app/settings/actions";

export function DeleteAccountDanger() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <article className="rounded-[1.75rem] border border-[var(--danger)]/35 bg-[var(--danger-soft)]/40 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">
            <TriangleAlert className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Danger Zone</p>
            <p className="text-xs text-[var(--muted)]">Eliminar cuenta y datos del tenant</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--danger)] px-5 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-white"
        >
          Eliminar cuenta
        </button>
      </article>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,20,26,0.42)] px-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--background)] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--danger)]">Danger</p>
                <h3 className="text-2xl font-semibold text-[var(--foreground)]">Estas seguro?</h3>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Si confirmas, se elimina tu cuenta y todos los datos asociados en Vase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--surface-strong)]"
                aria-label="Cerrar modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)] disabled:opacity-60"
              >
                No
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteTenantAccountAction();
                  })
                }
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--danger)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                Si, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


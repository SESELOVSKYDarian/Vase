"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { CreatePageForm } from "@/components/business/create-page-form";
import { CustomPageRequestForm } from "@/components/business/custom-page-form";
import { StorefrontPagesTable } from "@/components/business/storefront-pages-table";

type PageRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  statusTone: "success" | "warning" | "danger" | "neutral";
  isTemporary: boolean;
  lifecycleLabel: string;
  domains: string[];
};

type SlotOption = {
  id: string;
  startsAt: Date | string;
  endsAt: Date | string;
  capacity: number;
  reservedCount: number;
  notes: string | null;
};

export function BusinessSitesWorkspace({
  canCreatePage,
  pages,
  slots,
}: {
  canCreatePage: boolean;
  pages: PageRow[];
  slots: SlotOption[];
}) {
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState<"choice" | "template" | "custom">("choice");
  const hasSlots = useMemo(
    () => slots.some((slot) => slot.capacity > slot.reservedCount),
    [slots],
  );

  return (
    <section className="space-y-6 rounded-[32px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,white)] p-8 shadow-[0_24px_48px_rgba(25,28,27,0.05)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
            Sitios y dominios
          </p>
          <h2 className="font-serif text-4xl tracking-[-0.04em] text-[var(--foreground)]">
            Multiples webs dentro de Vase Business
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setFlow("choice");
            setOpen(true);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
        >
          <span aria-hidden>+</span>
          Nueva pagina
        </button>
      </div>

      <StorefrontPagesTable pages={pages} />

      {open ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--background)] p-6 shadow-[0_36px_90px_rgba(2,8,23,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-[var(--foreground)]">Nueva pagina</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                aria-label="Cerrar modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {flow === "choice" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setFlow("template")} className="rounded-2xl border border-[var(--border-subtle)] p-4 text-left">
                  <p className="font-semibold text-[var(--foreground)]">Crear con plantilla</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Usa el flujo estandar de creacion.</p>
                </button>
                <button type="button" onClick={() => setFlow("custom")} className="rounded-2xl border border-[var(--border-subtle)] p-4 text-left">
                  <p className="font-semibold text-[var(--foreground)]">Pedir plantilla personalizada</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Incluye formulario completo y agenda.</p>
                </button>
              </div>
            ) : null}

            {flow === "template" ? (
              <div className="space-y-3">
                <button type="button" onClick={() => setFlow("choice")} className="text-sm font-semibold text-[var(--accent)]">Volver</button>
                <CreatePageForm canCreate={canCreatePage} />
              </div>
            ) : null}

            {flow === "custom" ? (
              <div className="space-y-3">
                <button type="button" onClick={() => setFlow("choice")} className="text-sm font-semibold text-[var(--accent)]">Volver</button>
                {!hasSlots ? (
                  <p className="rounded-2xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--muted)]">
                    No hay horarios disponibles ahora. Nuestro equipo de Super Admin debe habilitar nuevos slots.
                  </p>
                ) : (
                  <CustomPageRequestForm slots={slots} />
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useActionState, useState } from "react";
import { ClipboardCheck, X } from "lucide-react";
import { reviewCustomizationRequestAction, type AdminReviewActionState } from "@/app/(platform)/app/admin/actions";

const initialState: AdminReviewActionState = {};

type AdminCustomizationReviewFormProps = {
  requestId: string;
  currentStatus: string;
  quotedPriceLabel?: string | null;
  reviewNotes?: string | null;
};

export function AdminCustomizationReviewForm({
  requestId,
  currentStatus,
  quotedPriceLabel,
  reviewNotes,
}: AdminCustomizationReviewFormProps) {
  const [state, formAction] = useActionState(reviewCustomizationRequestAction, initialState);
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Estado y revisión</p>
          <p className="text-xs text-[var(--muted)]">Controla estado operativo y notas internas.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
        >
          <ClipboardCheck className="size-4" />
          Editar estado
        </button>
      </div>
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/50 p-4">
          <form action={formAction} className="w-full max-w-2xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--background)] p-6 shadow-[0_35px_90px_rgba(2,8,23,0.35)]">
            <input type="hidden" name="requestId" value={requestId} />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Workflow</p>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Actualizar estado</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)]">
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">Estado</span>
                <select name="status" defaultValue={currentStatus} className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-transparent px-4 text-[var(--foreground)]">
                  <option value="REVIEWING">Reviewing</option>
                  <option value="QUOTED">Quoted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">Cotización visible</span>
                <input name="quotedPriceLabel" defaultValue={quotedPriceLabel ?? ""} className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-transparent px-4 text-[var(--foreground)]" placeholder="Desde USD 1.500" />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">Notas internas</span>
                <textarea name="reviewNotes" defaultValue={reviewNotes ?? ""} rows={4} className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-transparent px-4 py-3 text-[var(--foreground)]" />
              </label>
              <button type="submit" className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]">
                Guardar revisión
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

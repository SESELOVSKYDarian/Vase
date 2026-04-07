"use client";

import { useActionState } from "react";
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

  return (
    <form action={formAction} className="grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Estado</span>
        <select
          name="status"
          defaultValue={currentStatus}
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        >
          <option value="REVIEWING">Reviewing</option>
          <option value="QUOTED">Quoted</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Cotizacion visible</span>
        <input
          name="quotedPriceLabel"
          defaultValue={quotedPriceLabel ?? ""}
          className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
          placeholder="Desde USD 1.500"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">Notas internas</span>
        <textarea
          name="reviewNotes"
          defaultValue={reviewNotes ?? ""}
          rows={3}
          className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
        />
      </label>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Guardar revision
      </button>

      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateTenantWebLimitAction } from "@/app/(platform)/app/admin/web-limit-actions";
import { MAX_BUSINESS_WEB_LIMIT } from "@/lib/business/plans";

export function AdminWebLimitField({ tenantId, initialLimit }: { tenantId: string; initialLimit: number }) {
  const [limit, setLimit] = useState(String(initialLimit));
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setResult(null);
    startTransition(async () => {
      setResult(await updateTenantWebLimitAction({ tenantId, limit: Number(limit) }));
    });
  };

  return (
    <div className="mt-4 grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
      <label className="grid gap-1 text-sm" htmlFor="admin-web-limit">
        <span className="font-semibold text-[var(--foreground)]">Webs que puede crear en Vase Business</span>
        <span className="text-xs text-[var(--muted)]">Se aplica al momento y se guarda aparte del resto del formulario.</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          id="admin-web-limit"
          type="number"
          min={1}
          max={MAX_BUSINESS_WEB_LIMIT}
          step={1}
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          className="min-h-11 w-28 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--foreground)]"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar límite"}
        </button>
        {result ? (
          <span role="status" className={result.ok ? "text-sm text-[var(--success)]" : "text-sm text-[var(--danger)]"}>
            {result.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateTenantLimitAction, type TenantLimitKind } from "@/app/(platform)/app/admin/web-limit-actions";

const COPY: Record<TenantLimitKind, { label: string; button: string }> = {
  webs: { label: "Webs que puede crear en Vase Business", button: "Guardar límite de webs" },
  team: { label: "Personas que puede sumar a su equipo", button: "Guardar límite de equipo" },
};

export function AdminTenantLimitField({
  tenantId,
  kind,
  initialLimit,
  max,
}: {
  tenantId: string;
  kind: TenantLimitKind;
  initialLimit: number;
  max: number;
}) {
  const [limit, setLimit] = useState(String(initialLimit));
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = `admin-limit-${kind}`;

  const save = () => {
    setResult(null);
    startTransition(async () => {
      setResult(await updateTenantLimitAction({ tenantId, kind, limit: Number(limit) }));
    });
  };

  return (
    <div className="mt-4 grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
      <label className="grid gap-1 text-sm" htmlFor={inputId}>
        <span className="font-semibold text-[var(--foreground)]">{COPY[kind].label}</span>
        <span className="text-xs text-[var(--muted)]">Se aplica al momento y se guarda aparte del resto del formulario.</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          type="number"
          min={1}
          max={max}
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
          {isPending ? "Guardando..." : COPY[kind].button}
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

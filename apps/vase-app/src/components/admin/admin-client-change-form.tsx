"use client";

import { useActionState, useState } from "react";
import { createClientChangeAction, type ClientChangeState } from "@/app/(platform)/app/admin/customizations/actions";

type TenantOption = { id: string; accountName: string; name: string };

const STATUS = [
  { value: "REVIEWING", label: "Lo estamos viendo" },
  { value: "IN_PROGRESS", label: "En desarrollo" },
  { value: "DELIVERED", label: "Entregado" },
];

const field = "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]";

/** Cargar un cambio que el cliente pidió por fuera del panel (mail, WhatsApp, reunión). */
export function AdminClientChangeForm({ tenants }: { tenants: TenantOption[] }) {
  const [state, action, pending] = useActionState<ClientChangeState, FormData>(createClientChangeAction, {});
  const [free, setFree] = useState(true);

  return (
    <section className="grid gap-4 rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Cargar un cambio para un cliente</h2>
        <p className="text-sm text-[var(--muted)]">
          Para lo que te pidieron por mail, WhatsApp o en una reunión. El cliente lo ve en Trabajos a medida con su paso.
        </p>
      </div>
      <form action={action} className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-[var(--foreground)]">
          Cliente
          <select name="tenantId" required className={field} defaultValue="">
            <option value="" disabled>Elegí un cliente</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.accountName || tenant.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--foreground)]">
          En qué paso está
          <select name="status" className={field} defaultValue="IN_PROGRESS">
            {STATUS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--foreground)] md:col-span-2">
          Qué hay que cambiar
          <input name="title" required minLength={3} maxLength={160} className={field} placeholder="Ej.: Los clientes entran sin esperar aprobación" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[var(--foreground)] md:col-span-2">
          Detalle
          <textarea name="detail" required minLength={3} maxLength={4000} rows={3} className={`${field} py-2`} placeholder="Qué pidió el cliente y cómo lo vamos a resolver." />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <input type="checkbox" name="free" checked={free} onChange={(event) => setFree(event.target.checked)} />
          Sin cargo
        </label>
        {!free ? (
          <input name="priceLabel" maxLength={120} className={field} placeholder="Precio (ej.: $120.000)" />
        ) : <span />}
        <div className="flex items-center gap-3 md:col-span-2">
          <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60">
            {pending ? "Cargando…" : "Cargar cambio"}
          </button>
          {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}
        </div>
      </form>
    </section>
  );
}

"use client";

import { useActionState } from "react";
import { createTestChargeAction, type TestChargeState } from "@/app/(platform)/app/admin/actions/test-charge";

const initial: TestChargeState = {};

/** Admin › Finanzas: crea una factura chica en una cuenta para probar Mercado Pago con plata real. */
export function TestChargeForm() {
  const [state, action, pending] = useActionState(createTestChargeAction, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Correo del dueño de la cuenta
          <input
            name="email"
            type="email"
            required
            placeholder="administracion+pruebas@vase.ar"
            className="h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--foreground)]"
          />
        </label>
        <label className="flex w-32 flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
          Monto
          <input
            name="amount"
            defaultValue="100"
            inputMode="decimal"
            className="h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--foreground)]"
          />
        </label>
        <button type="submit" disabled={pending} className="h-10 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Creando..." : "Crear cobro de prueba"}
        </button>
      </div>
      {state.message ? (
        <p role="status" className={`text-sm font-semibold ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
          {state.message}
        </p>
      ) : null}
      <p className="text-xs text-[var(--muted)]">
        Pagala con tu tarjeta desde Plan y pagos de esa cuenta y después devolvé el pago desde Mercado Pago (Actividad › el pago › Devolver).
      </p>
    </form>
  );
}

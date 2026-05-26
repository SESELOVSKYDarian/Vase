"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Plus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createMeetingAvailabilitySlotAction } from "@/app/(platform)/app/admin/actions";

type TenantOption = {
  id: string;
  accountName: string;
  name: string;
};

type UpcomingSlot = {
  id: string;
  startsAt: Date | string;
  endsAt: Date | string;
  capacity: number;
  reservedCount: number;
  tenant: {
    id: string;
    accountName: string;
  };
};

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminMeetingSlotManager({
  tenants,
  upcomingSlots,
}: {
  tenants: TenantOption[];
  upcomingSlots: UpcomingSlot[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createMeetingAvailabilitySlotAction, {});
  const [isOpen, setIsOpen] = useState(false);
  const defaultTenantId = tenants[0]?.id ?? "";
  const totalAvailable = useMemo(
    () =>
      upcomingSlots.reduce(
        (acc, slot) => acc + Math.max(0, Number(slot.capacity) - Number(slot.reservedCount)),
        0,
      ),
    [upcomingSlots],
  );

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);

  return (
    <section className="grid gap-4 rounded-[32px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_92%,white),color-mix(in_srgb,var(--surface-strong)_84%,transparent))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
            Agenda comercial
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Gestión de horarios premium
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] transition duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)]/30"
        >
          <Plus className="size-4" />
          Nuevo horario
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
            <CalendarDays className="size-4" />
            Slots próximos
          </p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{upcomingSlots.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
            <Users className="size-4" />
            Cupos disponibles
          </p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{totalAvailable}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
            <Clock3 className="size-4" />
            Estado
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {tenants.length > 0 ? "Agenda habilitada" : "Sin tenants para agendar"}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">Próximos horarios</p>
        {upcomingSlots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--muted)]">
            Todavía no hay horarios cargados.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {upcomingSlots.map((slot) => (
              <div
                key={slot.id}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-3 text-sm"
              >
                <p className="font-semibold text-[var(--foreground)]">{slot.tenant.accountName}</p>
                <p className="text-[var(--muted)]">
                  {formatDate(slot.startsAt)} → {formatDate(slot.endsAt)}
                </p>
                <p className="text-[var(--muted)]">
                  Cupos: {slot.reservedCount}/{slot.capacity}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--background)] p-6 shadow-[0_35px_90px_rgba(2,8,23,0.35)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                  Nuevo horario
                </p>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Crear slot en calendario</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--surface-strong)]"
                aria-label="Cerrar modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <form action={action} className="grid gap-3">
              <label className="text-xs text-[var(--muted)]">Cliente/tenant</label>
              <select
                name="tenantId"
                defaultValue={defaultTenantId}
                className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.accountName} · {tenant.name}
                  </option>
                ))}
              </select>

              <div className="grid gap-2 md:grid-cols-2">
                <input
                  name="startsAt"
                  type="datetime-local"
                  className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
                />
                <input
                  name="endsAt"
                  type="datetime-local"
                  className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <input
                  name="durationMinutes"
                  type="number"
                  min={15}
                  defaultValue={60}
                  className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
                />
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
                />
              </div>

              <input
                name="notes"
                placeholder="Notas opcionales"
                className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
              />

              <div className="mt-2 flex justify-end">
                <button
                  disabled={pending || tenants.length === 0}
                  className="inline-flex min-h-11 min-w-44 cursor-pointer items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] transition duration-200 hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "Creando..." : "Crear horario"}
                </button>
              </div>
            </form>
            {state.error ? <p className="mt-3 text-xs text-[var(--danger)]">{state.error}</p> : null}
            {state.success ? <p className="mt-3 text-xs text-[var(--success)]">{state.success}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

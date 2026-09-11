"use client";

export type ProductionWorker = { id: string; name: string; activeOrders: number; pendingOrders: number; inProgressOrders: number };

export function initials(name?: string | null) { return name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "--"; }

export function WorkerSelector({ label, value, workers, onChange }: { label: string; value: string | null; workers: ProductionWorker[]; onChange: (value: string | null) => void }) {
  return <label className="block">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
    <select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm transition-colors focus:border-vase-green">
      <option value="">Sin asignar</option>
      {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.pendingOrders} pendientes · {worker.inProgressOrders} en proceso</option>)}
    </select>
  </label>;
}


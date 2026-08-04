"use client";

import type { LabsAdminTenantControl, LabsChannel, LabsChannelLimits } from "@vase/contracts";
import { useState } from "react";

const channels: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

export function LabsAdminWorkspace({ initialControls }: { initialControls: LabsAdminTenantControl[] }) {
  const [controls, setControls] = useState(initialControls);
  const [editing, setEditing] = useState<LabsAdminTenantControl | null>(null);
  const active = controls.filter((item) => item.labsActive).length;

  return <div className="space-y-8">
    <section className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">Super Admin · Vase Labs</p>
      <h2 className="mt-3 max-w-3xl text-4xl font-semibold">Permisos precisos sin alterar el plan pagado.</h2>
      <p className="mt-3 max-w-3xl text-[var(--muted)]">Administrá cupos por canal, revisá excepciones y verificá que cada cambio se sincronice con Labs.</p>
    </section>
    <section className="grid gap-4 md:grid-cols-3">
      {[
        ["Empresas con Labs", active],
        ["Overrides activos", controls.filter((item) => item.manualOverride).length],
        ["Sincronizaciones pendientes", controls.filter((item) => item.syncStatus !== "SYNCED").length],
      ].map(([label, value]) => <article className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] p-5" key={String(label)}><span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</span><strong className="mt-3 block text-4xl">{value}</strong></article>)}
    </section>
    <section className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Entitlements</p>
      <h2 className="mt-2 text-3xl font-semibold">Planes y límites efectivos</h2>
      <div className="mt-5 space-y-3">
        {controls.map((control) => <article className="grid gap-4 rounded-xl border border-[var(--border-subtle)] p-4 lg:grid-cols-[1.4fr_1.2fr_1fr_auto] lg:items-center" key={control.globalTenantId}>
          <div><span className="text-xs text-[var(--muted)]">{control.globalTenantId}</span><strong className="mt-1 block">{control.companyName}</strong><p className="text-sm text-[var(--muted)]">{control.plan} · {control.serviceStatus}</p></div>
          <div className="flex flex-wrap gap-2">{channels.map((channel) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(control.channelLimits?.[channel] ?? 0) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`} key={channel}>{channel} · {control.channelLimits?.[channel] ?? 0}</span>)}</div>
          <div><span className="text-xs uppercase text-[var(--muted)]">Origen</span><strong className="block text-sm">{control.manualOverride ? control.overrideReason : "Límites incluidos por plan"}</strong><em className="mt-1 block text-xs not-italic">Sync · {control.syncStatus ?? "SYNCED"}</em></div>
          <button className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold" onClick={() => setEditing(control)}>Editar Labs</button>
        </article>)}
        {!controls.length ? <p className="rounded-xl bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">No hay tenants de Labs disponibles.</p> : null}
      </div>
    </section>
    {editing ? <OverrideDrawer
      control={editing}
      onClose={() => setEditing(null)}
      onSaved={(control) => {
        setControls((current) => current.map((item) => item.globalTenantId === control.globalTenantId ? control : item));
        setEditing(null);
      }}
    /> : null}
  </div>;
}

function OverrideDrawer({
  control,
  onClose,
  onSaved,
}: {
  control: LabsAdminTenantControl;
  onClose(): void;
  onSaved(control: LabsAdminTenantControl): void;
}) {
  const [limits, setLimits] = useState<LabsChannelLimits>(control.channelLimits ?? {
    WHATSAPP: 0,
    INSTAGRAM: 0,
    FACEBOOK: 0,
  });
  const [reason, setReason] = useState(control.overrideReason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(channelLimits: LabsChannelLimits | null) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/labs/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          globalTenantId: control.globalTenantId,
          channelLimits,
          reason: reason || "Restauración de límites del plan",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "LABS_OVERRIDE_FAILED");
      onSaved({
        ...control,
        channelLimits: payload.effective.channelLimits,
        enabledChannels: payload.effective.enabledChannels,
        manualOverride: payload.effective.manualOverride,
        overrideReason: channelLimits ? reason : null,
        syncStatus: payload.syncStatus,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el override.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-[70] flex justify-end bg-black/35" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="h-full w-full max-w-xl overflow-y-auto bg-[var(--background)] p-7 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Override de Labs</p><h2 className="mt-2 text-3xl font-semibold">{control.companyName}</h2><p className="mt-2 text-sm text-[var(--muted)]">El plan pagado sigue siendo <strong>{control.plan}</strong>.</p></div><button className="text-2xl" aria-label="Cerrar" onClick={onClose}>×</button></div>
      <div className="mt-8 space-y-3">{channels.map((channel) => <label className="grid grid-cols-[1fr_5rem_7rem] items-center gap-3 rounded-xl bg-[var(--surface-strong)] p-3" key={channel}><strong className="text-sm">{channel}</strong><span className="text-center text-sm">Plan {control.planChannelLimits?.[channel] ?? 0}</span><input className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3" type="number" min="0" max="20" value={limits[channel]} onChange={(event) => setLimits({ ...limits, [channel]: Math.max(0, Number(event.target.value) || 0) })} /></label>)}</div>
      <label className="mt-6 grid gap-2 text-sm font-semibold">Motivo obligatorio<textarea className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] p-3 font-normal" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Ej. ampliación comercial aprobada por…" /></label>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button className="min-h-11 rounded-xl border border-[var(--border-subtle)] px-5 text-sm font-semibold" onClick={() => void save(null)} disabled={saving}>Restaurar plan</button><button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void save(limits)} disabled={saving || reason.trim().length < 8}>{saving ? "Guardando…" : "Guardar override"}</button></div>
    </aside>
  </div>;
}

"use client";

import type { LabsAdminTenantControl, LabsChannel, LabsChannelLimits } from "@vase/contracts";
import { useState } from "react";

const channels: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];
const CHANNEL_LABEL: Record<LabsChannel, string> = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", FACEBOOK: "Facebook" } as Record<LabsChannel, string>;

export function LabsAdminWorkspace({ initialControls }: { initialControls: LabsAdminTenantControl[] }) {
  const [controls, setControls] = useState(initialControls);
  const [editing, setEditing] = useState<LabsAdminTenantControl | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
  const active = controls.filter((item) => item.labsActive).length;

  async function removeEntitlement(control: LabsAdminTenantControl) {
    if (!window.confirm(`¿Sacarle Labs a ${control.companyName}?`)) return;
    setRemovingId(control.globalTenantId);
    setRemoveError("");
    try {
      const response = await fetch("/api/admin/labs/tenants", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ globalTenantId: control.globalTenantId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "LABS_ENTITLEMENT_REMOVE_FAILED");
      setControls((current) => current.filter((item) => item.globalTenantId !== control.globalTenantId));
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "No se pudo quitar el entitlement.");
    } finally {
      setRemovingId(null);
    }
  }

  return <div className="vpa-stack">
    <section className="vpa-kpis" aria-label="Resumen">
      <div className="vpa-kpi"><span className="vpa-kt"><small>Cuentas con Labs</small><b>{active}</b></span></div>
      <div className="vpa-kpi"><span className="vpa-kt"><small>Con límites a mano</small><b>{controls.filter((item) => item.manualOverride).length}</b><em>Distintos a su plan</em></span></div>
      <div className="vpa-kpi"><span className="vpa-kt"><small>Sin sincronizar</small><b>{controls.filter((item) => item.syncStatus && item.syncStatus !== "SYNCED").length}</b></span></div>
    </section>

    <section className="vpa-card" style={{ padding: "12px 20px" }}>
      {!controls.length ? <div className="vpa-empty" style={{ margin: "8px 0" }}>Ninguna cuenta tiene Labs todavía.</div> : (
        <div className="vpa-tw">
          <table className="vpa-tbl">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Canales (cupos)</th>
                <th>Límites</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {controls.map((control) => <tr key={control.globalTenantId}>
                <td className="wrap">
                  <b>{control.companyName}</b>
                  <span className="sub">Plan {control.plan} · {control.serviceStatus}{control.ownerDeleted ? " · cuenta borrada" : ""}</span>
                </td>
                <td>
                  <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                    {channels.map((channel) => <span key={channel} className={`vpa-tag ${(control.channelLimits?.[channel] ?? 0) > 0 ? "g" : ""}`}><i />{CHANNEL_LABEL[channel]} {control.channelLimits?.[channel] ?? 0}</span>)}
                  </span>
                </td>
                <td className="wrap vpa-mut">
                  {control.manualOverride ? (control.overrideReason ?? "A mano") : "Los del plan"}
                  {control.syncStatus && control.syncStatus !== "SYNCED" ? <span className="sub">Falta sincronizar</span> : null}
                </td>
                <td className="r">
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <button type="button" className="vpa-btn line sm" onClick={() => setEditing(control)}>Cambiar cupos</button>
                    <button type="button" aria-label={`Sacarle Labs a ${control.companyName}`} className="vpa-btn line sm danger" onClick={() => void removeEntitlement(control)} disabled={removingId === control.globalTenantId}>{removingId === control.globalTenantId ? "Sacando..." : "Sacar Labs"}</button>
                  </span>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
      {removeError ? <p className="vpa-saveerr" role="alert" style={{ marginTop: 12 }}>{removeError}</p> : null}
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

  return <div className="fixed inset-0 z-[70] flex justify-end" style={{ background: "var(--scrim)" }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="h-full w-full max-w-xl overflow-y-auto p-7" style={{ background: "var(--card)" }}>
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{control.companyName}</h2><p className="mt-2 text-sm text-[var(--muted)]">El plan pagado sigue siendo <strong>{control.plan}</strong>.</p></div><button className="text-2xl" aria-label="Cerrar" onClick={onClose}>×</button></div>
      <div className="mt-8 space-y-3">{channels.map((channel) => <label className="grid grid-cols-[1fr_5rem_7rem] items-center gap-3 rounded-xl bg-[var(--surface-strong)] p-3" key={channel}><strong className="text-sm">{CHANNEL_LABEL[channel]}</strong><span className="text-center text-sm">Plan {control.planChannelLimits?.[channel] ?? 0}</span><input className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3" type="number" min="0" max="20" value={limits[channel]} onChange={(event) => setLimits({ ...limits, [channel]: Math.max(0, Number(event.target.value) || 0) })} /></label>)}</div>
      <label className="mt-6 grid gap-2 text-sm font-semibold">Por qué lo cambiás<textarea className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] p-3 font-normal" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Ej.: le dimos un número más de WhatsApp" /></label>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button className="min-h-11 rounded-xl border border-[var(--border-subtle)] px-5 text-sm font-semibold" onClick={() => void save(null)} disabled={saving}>Volver a los del plan</button><button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void save(limits)} disabled={saving || reason.trim().length < 8}>{saving ? "Guardando…" : "Guardar"}</button></div>
    </aside>
  </div>;
}

"use client";

import type { LabsAdminTenantControl, LabsChannel, LabsChannelLimits } from "@vase/contracts";
import { useState } from "react";

const channels: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

export function LabsAdminWorkspace({ initialControls }: { initialControls: LabsAdminTenantControl[] }) {
  const [controls, setControls] = useState(initialControls);
  const [editing, setEditing] = useState<LabsAdminTenantControl | null>(null);
  const active = controls.filter((item) => item.labsActive).length;

  return <main className="admin-shell">
    <section className="admin-hero"><p className="eyebrow">Superadmin · Vase Labs</p><h1>Permisos precisos, sin alterar el plan pagado.</h1><p>Administra cupos por canal, revisa excepciones y controla que cada cambio llegue correctamente a Labs.</p></section>
    <section className="admin-metrics"><article><span>Empresas con Labs</span><strong>{active}</strong></article><article><span>Overrides activos</span><strong>{controls.filter((item) => item.manualOverride).length}</strong></article><article><span>Sincronizaciones pendientes</span><strong>{controls.filter((item) => item.syncStatus !== "SYNCED").length}</strong></article></section>
    <section className="admin-panel"><div className="section-heading"><p className="eyebrow">Entitlements</p><h2>Planes y límites efectivos</h2></div><div className="labs-admin-list">{controls.map((control) => <article className="labs-admin-row" key={control.globalTenantId}><div className="tenant-main"><span className="tenant-id">{control.globalTenantId}</span><strong>{control.companyName}</strong><p>{control.plan} · {control.serviceStatus}{control.manualOverride ? " · Excepcion manual" : ""}</p></div><div className="channel-control">{channels.map((channel) => <span className={(control.channelLimits?.[channel] ?? 0) > 0 ? "is-enabled" : ""} key={channel}>{channel} · {control.channelLimits?.[channel] ?? 0}</span>)}</div><div className="admin-override-summary"><span>Origen</span><strong>{control.manualOverride ? control.overrideReason : "Limites incluidos por plan"}</strong><em className={`sync-${(control.syncStatus ?? "SYNCED").toLowerCase()}`}>{control.syncStatus ?? "SYNCED"}</em></div><div className="admin-actions"><button onClick={() => setEditing(control)}>Editar Labs</button></div></article>)}</div></section>
    {editing ? <OverrideDrawer control={editing} onClose={() => setEditing(null)} onSaved={(control) => { setControls((current) => current.map((item) => item.globalTenantId === control.globalTenantId ? control : item)); setEditing(null); }} /> : null}
  </main>;
}

function OverrideDrawer({ control, onClose, onSaved }: { control: LabsAdminTenantControl; onClose(): void; onSaved(control: LabsAdminTenantControl): void }) {
  const [limits, setLimits] = useState<LabsChannelLimits>(control.channelLimits ?? { WHATSAPP: 0, INSTAGRAM: 0, FACEBOOK: 0 });
  const [reason, setReason] = useState(control.overrideReason ?? "");
  const [saving, setSaving] = useState(false);
  async function save(channelLimits: LabsChannelLimits | null) { setSaving(true); const response = await fetch("/api/labs/tenants", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ globalTenantId: control.globalTenantId, channelLimits, reason: reason || "Restauracion de limites del plan" }) }); const payload = await response.json().catch(() => ({})); setSaving(false); if (response.ok) onSaved({ ...control, channelLimits: payload.effective.channelLimits, enabledChannels: payload.effective.enabledChannels, manualOverride: payload.effective.manualOverride, overrideReason: channelLimits ? reason : null, syncStatus: payload.syncStatus }); }
  return <div className="admin-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="admin-drawer"><header><p className="eyebrow">Override de Labs</p><h2>{control.companyName}</h2><p>El plan pagado sigue siendo <strong>{control.plan}</strong>.</p></header><section><div className="limit-compare"><span>Canal</span><span>Plan</span><span>Efectivo</span>{channels.map((channel) => <div className="limit-row" key={channel}><strong>{channel}</strong><em>{control.planChannelLimits?.[channel] ?? 0}</em><input type="number" min="0" max="20" value={limits[channel]} onChange={(event) => setLimits({ ...limits, [channel]: Math.max(0, Number(event.target.value) || 0) })} /></div>)}</div><label className="admin-reason">Motivo obligatorio<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Ej. ampliación comercial aprobada por..." /></label></section><footer><button className="admin-button-secondary" onClick={() => save(null)} disabled={saving}>Restaurar plan</button><button className="admin-button-primary" onClick={() => save(limits)} disabled={saving || reason.trim().length < 8}>{saving ? "Guardando..." : "Guardar override"}</button></footer></aside></div>;
}

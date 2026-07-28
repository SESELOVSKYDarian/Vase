"use client";

import type { RestPlan, RestPlanLimits } from "@vase/contracts";
import { useState } from "react";

export type RestPricingView = {
  id: string;
  plan: RestPlan;
  version: number;
  currency: string;
  monthlyPrice: number;
  limits: RestPlanLimits;
  effectiveAt: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
};

const plans: RestPlan[] = ["STARTER", "GROWTH", "PRO", "ENTERPRISE"];
const initialLimits: RestPlanLimits = {
  branches: 1,
  localEmployees: 15,
  devices: 5,
  edgeInstallations: 1,
};

export function RestAdminWorkspace({
  initialVersions,
  initialHealth,
}: {
  initialVersions: RestPricingView[];
  initialHealth: "ok" | "degraded" | "unavailable";
}) {
  const [versions, setVersions] = useState(initialVersions);
  const [plan, setPlan] = useState<RestPlan>("STARTER");
  const [currency, setCurrency] = useState("ARS");
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [limits, setLimits] = useState(initialLimits);
  const [effectiveAt, setEffectiveAt] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function send(command: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/rest/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(payload.error ?? "No se pudo guardar el cambio.");
      return null;
    }
    return payload;
  }

  async function createDraft() {
    if (!effectiveAt) {
      setMessage("Definí la fecha efectiva antes de crear el borrador.");
      return;
    }
    const created = await send({
      action: "CREATE_DRAFT",
      plan,
      currency,
      monthlyPrice,
      limits,
      effectiveAt: new Date(`${effectiveAt}T00:00:00.000Z`).toISOString(),
    });
    if (created) {
      setVersions((current) => [created as RestPricingView, ...current]);
      setMessage("Borrador creado. Revisalo antes de publicar.");
    }
  }

  async function publish(version: RestPricingView) {
    if (!window.confirm(`Publicar ${version.plan} v${version.version}? La versión quedará inmutable.`)) return;
    const published = await send({ action: "PUBLISH", pricingVersionId: version.id });
    if (published) {
      setVersions((current) => current.map((item) => item.id === version.id ? published as RestPricingView : item));
      setMessage("Versión publicada.");
    }
  }

  function updateLimit(field: keyof RestPlanLimits, value: number) {
    setLimits((current) => ({ ...current, [field]: Math.max(1, value || 1) }));
  }

  return (
    <section className="admin-panel rest-admin">
      <div className="section-heading rest-heading">
        <div>
          <p className="eyebrow">Vase Rest · planes versionados</p>
          <h2>Precios y capacidad</h2>
        </div>
        <span className={`rest-health rest-health-${initialHealth}`}>Rest · {initialHealth}</span>
      </div>

      <div className="rest-plan-editor">
        <label>Plan<select value={plan} onChange={(event) => setPlan(event.target.value as RestPlan)}>{plans.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Moneda<input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
        <label>Precio mensual<input type="number" min="0" value={monthlyPrice} onChange={(event) => setMonthlyPrice(Math.max(0, Number(event.target.value) || 0))} /></label>
        <label>Vigente desde<input type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /></label>
        <label>Sucursales<input type="number" min="1" value={limits.branches} onChange={(event) => updateLimit("branches", Number(event.target.value))} /></label>
        <label>Personal local<input type="number" min="1" value={limits.localEmployees} onChange={(event) => updateLimit("localEmployees", Number(event.target.value))} /></label>
        <label>Dispositivos<input type="number" min="1" value={limits.devices} onChange={(event) => updateLimit("devices", Number(event.target.value))} /></label>
        <label>Instalaciones Edge<input type="number" min="1" value={limits.edgeInstallations} onChange={(event) => updateLimit("edgeInstallations", Number(event.target.value))} /></label>
        <button className="admin-button-primary" disabled={saving} onClick={createDraft}>
          {saving ? "Guardando…" : "Crear borrador"}
        </button>
      </div>
      {message ? <p className="rest-message" role="status">{message}</p> : null}

      <div className="rest-version-list">
        {versions.map((version) => (
          <article key={version.id}>
            <div><span>{version.plan} · v{version.version}</span><strong>{version.currency} {version.monthlyPrice.toLocaleString("es-AR")}</strong></div>
            <p>{version.limits.branches} suc. · {version.limits.localEmployees} personas · {version.limits.devices} dispositivos · {version.limits.edgeInstallations} Edge</p>
            <em className={`rest-version-status status-${version.status.toLowerCase()}`}>{version.status}</em>
            {version.status === "DRAFT" ? <button onClick={() => publish(version)} disabled={saving}>Publicar versión</button> : null}
          </article>
        ))}
        {versions.length === 0 ? <p className="rest-empty">Todavía no hay versiones. Creá el primer borrador con valores comerciales reales.</p> : null}
      </div>
    </section>
  );
}

"use client";

import type { RestPlan, RestPlanLimits } from "@vase/contracts";
import { useMemo, useState } from "react";

export type RestPricingView = {
  id: string;
  plan: RestPlan;
  version: number;
  currency: string;
  monthlyPrice: number;
  limits: RestPlanLimits;
  effectiveAt: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type RestContractTenantView = {
  globalTenantId: string;
  name: string;
  slug: string;
  status: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    hasExplicitModuleAccess: boolean;
    hasRestAccess: boolean;
  }>;
  restContract: null | {
    pricingVersionId: string;
    plan: RestPlan;
    status: string;
    contractVersion: number;
    monthlyPrice: number;
    currency: string;
  };
};

export type RestOperationsView = {
  health: "ok" | "degraded" | "unavailable";
  tenants: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
};

const plans: RestPlan[] = ["STARTER", "GROWTH", "PRO", "ENTERPRISE"];
const initialLimits: RestPlanLimits = { branches: 1, localEmployees: 15, devices: 5, edgeInstallations: 1 };
const inputClass = "min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm";
const cardClass = "rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--background)] p-5";

export function RestAdminWorkspace({
  initialVersions,
  initialContractTenants,
  initialOperations,
}: {
  initialVersions: RestPricingView[];
  initialContractTenants: RestContractTenantView[];
  initialOperations: RestOperationsView;
}) {
  const [versions, setVersions] = useState(initialVersions);
  const [contractTenants, setContractTenants] = useState(initialContractTenants);
  const [operations, setOperations] = useState(initialOperations);
  const [plan, setPlan] = useState<RestPlan>("STARTER");
  const [currency, setCurrency] = useState("ARS");
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [limits, setLimits] = useState(initialLimits);
  const [effectiveAt, setEffectiveAt] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState(initialContractTenants[0]?.globalTenantId ?? "");
  const [selectedPricingVersionId, setSelectedPricingVersionId] = useState(
    initialVersions.find((version) => version.status === "PUBLISHED")?.id ?? "",
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedTenant = contractTenants.find((tenant) => tenant.globalTenantId === selectedTenantId);
  const publishedVersions = useMemo(() => versions.filter((version) => version.status === "PUBLISHED"), [versions]);

  async function send(command: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/rest/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "REST_ADMIN_COMMAND_FAILED");
      return payload;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el cambio.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function createDraft() {
    if (!effectiveAt) return setMessage("Definí la fecha efectiva antes de crear el borrador.");
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
      setMessage("Borrador creado con datos persistidos.");
    }
  }

  async function publish(version: RestPricingView) {
    if (!window.confirm(`¿Publicar ${version.plan} v${version.version}?`)) return;
    const published = await send({ action: "PUBLISH", pricingVersionId: version.id });
    if (published) {
      setVersions((current) => current.map((item) => item.id === version.id ? published as RestPricingView : item));
      setSelectedPricingVersionId(version.id);
      setMessage("Versión publicada.");
    }
  }

  async function acceptContract() {
    const pricing = versions.find((version) => version.id === selectedPricingVersionId);
    if (!selectedTenantId || !pricing) return setMessage("Seleccioná una cuenta y una versión publicada.");
    if (!window.confirm(`¿Asignar Vase Rest ${pricing.plan} a ${selectedTenant?.name ?? "la cuenta"}?`)) return;
    const entitlement = await send({ action: "ACCEPT_CONTRACT", globalTenantId: selectedTenantId, pricingVersionId: pricing.id });
    if (!entitlement) return;
    setContractTenants((current) => current.map((tenant) => tenant.globalTenantId === selectedTenantId ? {
      ...tenant,
      restContract: {
        pricingVersionId: pricing.id,
        plan: entitlement.plan,
        status: entitlement.status,
        contractVersion: entitlement.contractVersion,
        monthlyPrice: pricing.monthlyPrice,
        currency: pricing.currency,
      },
    } : tenant));
    setMessage("Contrato Rest actualizado.");
  }

  async function setUserAccess(userId: string, isActive: boolean) {
    const result = await send({ action: "SET_USER_ACCESS", globalTenantId: selectedTenantId, userId, isActive });
    if (!result) return;
    setContractTenants((current) => current.map((tenant) => tenant.globalTenantId === selectedTenantId ? {
      ...tenant,
      members: tenant.members.map((member) => member.id === userId
        ? { ...member, hasExplicitModuleAccess: true, hasRestAccess: isActive }
        : member),
    } : tenant));
  }

  async function refreshOperations() {
    const response = await fetch("/api/admin/rest/operations", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setOperations({ health: "unavailable", tenants: [], edges: [] });
      setMessage(payload.error ?? "Servicio Rest no disponible");
      return;
    }
    setOperations(payload as RestOperationsView);
    setMessage("Operación actualizada.");
  }

  const updateLimit = (field: keyof RestPlanLimits, value: number) =>
    setLimits((current) => ({ ...current, [field]: Math.max(1, value || 1) }));

  return <div className="space-y-8">
    <section className={cardClass}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Vase Rest · planes versionados</p><h2 className="mt-2 text-3xl font-semibold">Precios y capacidad</h2></div>
        <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold uppercase">Rest · {operations.health}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold uppercase">Plan<select className={inputClass} value={plan} onChange={(event) => setPlan(event.target.value as RestPlan)}>{plans.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold uppercase">Moneda<input className={inputClass} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
        <label className="grid gap-1 text-xs font-semibold uppercase">Precio mensual<input className={inputClass} type="number" min="0" value={monthlyPrice} onChange={(event) => setMonthlyPrice(Math.max(0, Number(event.target.value) || 0))} /></label>
        <label className="grid gap-1 text-xs font-semibold uppercase">Vigente desde<input className={inputClass} type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /></label>
        {([
          ["branches", "Sucursales"], ["localEmployees", "Personal local"], ["devices", "Dispositivos"], ["edgeInstallations", "Instalaciones Edge"],
        ] as const).map(([field, label]) => <label key={field} className="grid gap-1 text-xs font-semibold uppercase">{label}<input className={inputClass} type="number" min="1" value={limits[field]} onChange={(event) => updateLimit(field, Number(event.target.value))} /></label>)}
      </div>
      <button className="mt-4 min-h-11 rounded-xl bg-[var(--accent-strong)] px-6 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} onClick={() => void createDraft()}>{saving ? "Guardando…" : "Crear borrador"}</button>
      {message ? <p className="mt-4 rounded-xl bg-[var(--surface-strong)] p-3 text-sm" role="status">{message}</p> : null}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {versions.map((version) => <article className="rounded-xl border border-[var(--border-subtle)] p-4" key={version.id}>
          <div className="flex justify-between gap-3"><strong>{version.plan} · v{version.version}</strong><span>{version.currency} {version.monthlyPrice.toLocaleString("es-AR")}</span></div>
          <p className="mt-2 text-sm text-[var(--muted)]">{version.limits.branches} suc. · {version.limits.localEmployees} personas · {version.limits.devices} dispositivos · {version.limits.edgeInstallations} Edge</p>
          <div className="mt-3 flex items-center justify-between"><span className="text-xs font-semibold">{version.status}</span>{version.status === "DRAFT" ? <button className="text-sm font-semibold text-[var(--accent-strong)]" disabled={saving} onClick={() => void publish(version)}>Publicar versión</button> : null}</div>
        </article>)}
        {!versions.length ? <p className="text-sm text-[var(--muted)]">Todavía no hay versiones persistidas.</p> : null}
      </div>
    </section>

    <section className={cardClass}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Contratos y acceso</p><h2 className="mt-2 text-3xl font-semibold">Asignar Vase Rest</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <select className={inputClass} value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)}><option value="">Seleccionar cuenta</option>{contractTenants.map((tenant) => <option key={tenant.globalTenantId} value={tenant.globalTenantId}>{tenant.name} · {tenant.slug}</option>)}</select>
        <select className={inputClass} value={selectedPricingVersionId} onChange={(event) => setSelectedPricingVersionId(event.target.value)}><option value="">Seleccionar plan publicado</option>{publishedVersions.map((version) => <option key={version.id} value={version.id}>{version.plan} v{version.version} · {version.currency} {version.monthlyPrice}</option>)}</select>
        <button className="min-h-11 rounded-xl bg-[var(--accent-strong)] px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving || !selectedTenantId || !selectedPricingVersionId} onClick={() => void acceptContract()}>Habilitar o actualizar Rest</button>
      </div>
      {selectedTenant ? <div className="mt-5 rounded-xl bg-[var(--surface-strong)] p-4"><strong>{selectedTenant.name}</strong><p className="text-sm text-[var(--muted)]">{selectedTenant.restContract ? `${selectedTenant.restContract.plan} · ${selectedTenant.restContract.status}` : "Sin contrato Rest"}</p><ul className="mt-4 space-y-2">{selectedTenant.members.map((member) => <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--background)] p-3" key={member.id}><span className="text-sm"><strong>{member.name}</strong> · {member.email} · {member.role}</span><button disabled={saving || !selectedTenant.restContract} className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold disabled:opacity-50" onClick={() => void setUserAccess(member.id, !member.hasRestAccess)}>{member.hasRestAccess ? "Rest habilitado" : "Habilitar Rest"}</button></li>)}</ul></div> : null}
    </section>

    <section className={cardClass}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Operación en vivo</p><h2 className="mt-2 text-3xl font-semibold">Tenants y Edge</h2></div><button className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold" onClick={() => void refreshOperations()}>Actualizar</button></div>
      {operations.health === "unavailable" ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Servicio Rest no disponible. Los controles comerciales de App siguen operativos.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2"><div><strong>Tenants ({operations.tenants.length})</strong><pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-[var(--surface-strong)] p-3 text-xs">{JSON.stringify(operations.tenants, null, 2)}</pre></div><div><strong>Edge ({operations.edges.length})</strong><pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-[var(--surface-strong)] p-3 text-xs">{JSON.stringify(operations.edges, null, 2)}</pre></div></div>}
    </section>
  </div>;
}

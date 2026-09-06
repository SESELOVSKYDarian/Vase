"use client";

import { useId, useState } from "react";
import { Building2, ChevronDown, FlaskConical, Settings2, UtensilsCrossed } from "lucide-react";
import type { ClientProductAccess, CommercialStatus, LabsEntitlementPlan } from "@/lib/admin/client-product-access";
import { BusinessFeatureEditor, type BusinessFeatureCatalogItem } from "@/components/admin/business-feature-editor";

export type BusinessSubmoduleCatalogItem = {
  id: string;
  key: "plantilla" | "personalizado";
  name: string;
  features: BusinessFeatureCatalogItem[];
};

export type LabsPlanCatalogItem = {
  submoduleId: string;
  plan: LabsEntitlementPlan;
  label: string;
};

export type RestPricingVersionOption = {
  id: string;
  plan: string;
  version: number;
  currency: string;
  monthlyPrice: number;
  branchLimit: number;
  localEmployeeLimit: number;
  deviceLimit: number;
  edgeLimit: number;
  status: "PUBLISHED" | "ARCHIVED";
};

type Props = {
  owner: { name: string; email: string };
  value: ClientProductAccess;
  businessSubmodules: BusinessSubmoduleCatalogItem[];
  businessGeneralFeatures: BusinessFeatureCatalogItem[];
  labsPlans: LabsPlanCatalogItem[];
  restPricingVersions: RestPricingVersionOption[];
  managementAvailable: boolean;
  onChange: (value: ClientProductAccess) => void;
  pending?: boolean;
  error?: string;
};

const labsPlanOrder: LabsEntitlementPlan[] = ["STARTER", "PRO", "GROWTH"];

export function serializeClientProductAccessEnvelope(access: ClientProductAccess) {
  return JSON.stringify({ version: 2, productAccess: access });
}

export function canEditOwnerCommercialAccess(
  existingUserId: string,
  clientAccountKind: "OWNER" | "TEAM" | "UNASSIGNED",
) {
  return existingUserId.length === 0 || clientAccountKind === "OWNER";
}

export function serializeClientProductAccessForUser(
  existingUserId: string,
  clientAccountKind: "OWNER" | "TEAM" | "UNASSIGNED",
  access: ClientProductAccess,
) {
  return canEditOwnerCommercialAccess(existingUserId, clientAccountKind)
    ? serializeClientProductAccessEnvelope(access)
    : "";
}

const productCardClass = "overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm";
const inputClass = "min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]";

function statusLabel(status: CommercialStatus) {
  return status === "TRIAL" ? "Trial" : "Activo";
}

function channelsForPlan(plan: LabsEntitlementPlan) {
  if (plan === "STARTER") return "WhatsApp";
  if (plan === "PRO") return "WhatsApp + Instagram";
  return "WhatsApp + Instagram + Facebook Messenger";
}

function pricingLabel(option: RestPricingVersionOption, isCurrent: boolean) {
  const price = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: option.currency,
    maximumFractionDigits: 0,
  }).format(option.monthlyPrice);
  const base = `${option.plan.charAt(0) + option.plan.slice(1).toLowerCase()} · versión ${option.version} · ${price}/mes`;
  if (option.status === "PUBLISHED") return base;
  return `${base} · ${isCurrent ? "Actual · " : ""}no disponible`;
}

export function ClientTeamCommercialAccessNotice({ tenantName }: { tenantName: string | null }) {
  return (
    <section className="grid gap-3 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5" aria-label="Acceso comercial gestionado por el Owner">
      <h3 className="text-lg font-semibold text-[var(--foreground)]">Acceso gestionado por el Owner</h3>
      <p className="text-sm text-[var(--muted)]">
        Este usuario es miembro del equipo{tenantName ? ` de ${tenantName}` : ""}. Sus productos se asignan desde la cuenta Owner y no se editan desde este formulario.
      </p>
      <a href="/users" className="w-fit text-sm font-semibold text-[var(--accent-strong)] underline-offset-4 hover:underline">Ver equipo</a>
      <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]">
        Guardar identidad
      </button>
    </section>
  );
}

export function ClientProductAccessEditor({
  owner,
  value,
  businessSubmodules,
  businessGeneralFeatures,
  labsPlans,
  restPricingVersions,
  managementAvailable,
  onChange,
  pending = false,
  error,
}: Props) {
  const baseId = useId();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ business: true, labs: false, rest: false, management: false });
  const orderedLabsPlans = labsPlanOrder
    .map((plan) => labsPlans.find((option) => option.plan === plan))
    .filter((option): option is LabsPlanCatalogItem => Boolean(option));
  const defaultLabsPlan = orderedLabsPlans[0];
  const starterPlanMissing = orderedLabsPlans.length > 0 && !orderedLabsPlans.some((option) => option.plan === "STARTER");
  const publishedRestPricingVersions = restPricingVersions.filter((option) => option.status === "PUBLISHED");

  const setProduct = <Key extends keyof ClientProductAccess>(key: Key, product: ClientProductAccess[Key]) => {
    onChange({ ...value, [key]: product });
  };

  const toggleBusiness = (catalog: BusinessSubmoduleCatalogItem, nextStatus: "OFF" | CommercialStatus) => {
    const current = value.business?.submodules ?? [];
    const generalFeatureIds = new Set(businessGeneralFeatures.map((feature) => feature.id));
    const generalOverrides = current.flatMap((submodule) =>
      submodule.features.filter((feature) => generalFeatureIds.has(feature.featureId)));
    const placeGeneralOverrides = (submodules: typeof current) => {
      const ordered = businessSubmodules
        .map((option) => submodules.find((submodule) => submodule.id === option.id))
        .filter((submodule): submodule is typeof current[number] => Boolean(submodule));
      return ordered.map((submodule, index) => ({
        ...submodule,
        features: [
          ...submodule.features.filter((feature) => !generalFeatureIds.has(feature.featureId)),
          ...(index === 0 ? generalOverrides : []),
        ],
      }));
    };
    if (nextStatus === "OFF") {
      const submodules = placeGeneralOverrides(current.filter((item) => item.id !== catalog.id));
      setProduct("business", submodules.length ? { submodules } : null);
      return;
    }
    const existing = current.find((item) => item.id === catalog.id);
    const features = existing?.features ?? [];
    const selected = { id: catalog.id, key: catalog.key, status: nextStatus, features };
    const submodules = placeGeneralOverrides([...current.filter((item) => item.id !== catalog.id), selected]);
    setProduct("business", { submodules });
  };

  const selectedBusinessSubmodules = value.business?.submodules ?? [];
  const generalFeatureIds = new Set(businessGeneralFeatures.map((feature) => feature.id));
  const generalFeatureValue = selectedBusinessSubmodules.flatMap((submodule) =>
    submodule.features.filter((feature) => generalFeatureIds.has(feature.featureId)));
  const generalFeatureOwner = businessSubmodules
    .map((catalog) => selectedBusinessSubmodules.find((submodule) => submodule.id === catalog.id))
    .find(Boolean);

  const updateGeneralFeatures = (features: NonNullable<ClientProductAccess["business"]>["submodules"][number]["features"]) => {
    if (!generalFeatureOwner) return;
    setProduct("business", {
      submodules: selectedBusinessSubmodules.map((submodule) => ({
        ...submodule,
        features: [
          ...submodule.features.filter((feature) => !generalFeatureIds.has(feature.featureId)),
          ...(submodule.id === generalFeatureOwner.id ? features : []),
        ],
      })),
    });
  };

  const cards = [
    {
      key: "business",
      title: "Vase Business",
      icon: Building2,
      summary: value.business
        ? value.business.submodules.map((item) => `${item.key === "plantilla" ? "Plantilla" : "Personalizado"}: ${statusLabel(item.status)}`).join(" · ")
        : "Sin acceso",
      body: (
        <div className="grid gap-4">
          <p className="text-sm text-[var(--muted)]">Plantilla y Personalizado se administran por separado. Cada uno puede estar apagado, en Trial o Activo.</p>
          {generalFeatureOwner && businessGeneralFeatures.length ? (
            <details open className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Generales</summary>
              <p className="mb-3 mt-1 text-xs text-[var(--muted)]">Características que se aplican a Vase Business completo.</p>
              <BusinessFeatureEditor
                submoduleName="Generales"
                status={generalFeatureOwner.status}
                features={businessGeneralFeatures}
                value={generalFeatureValue}
                onChange={updateGeneralFeatures}
              />
            </details>
          ) : null}
          {businessSubmodules.map((catalog) => {
            const selected = value.business?.submodules.find((item) => item.id === catalog.id);
            return (
              <article key={catalog.id} className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-[var(--foreground)]">{catalog.name}</h4>
                    <p className="text-xs text-[var(--muted)]">Submódulo comercial independiente</p>
                  </div>
                  <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
                    Estado
                    <select
                      aria-label={`Estado de ${catalog.name}`}
                      value={selected?.status ?? "OFF"}
                      onChange={(event) => toggleBusiness(catalog, event.target.value as "OFF" | CommercialStatus)}
                      className={inputClass}
                    >
                      <option value="OFF">Sin acceso</option>
                      <option value="TRIAL">Trial</option>
                      <option value="ACTIVE">Pro · Activo</option>
                    </select>
                  </label>
                </div>
                {selected ? (
                  <details className="group rounded-2xl border border-[var(--border-subtle)] p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--accent-strong)]">Configurar características</summary>
                    <div className="mt-3">
                      <BusinessFeatureEditor
                        submoduleName={catalog.name}
                        status={selected.status}
                        features={catalog.features}
                        value={selected.features}
                        onChange={(features) => setProduct("business", {
                          submodules: (value.business?.submodules ?? []).map((item) => item.id === selected.id ? { ...item, features } : item),
                        })}
                      />
                    </div>
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>
      ),
    },
    {
      key: "labs",
      title: "Vase Labs",
      icon: FlaskConical,
      summary: value.labs ? `${value.labs.plan.charAt(0) + value.labs.plan.slice(1).toLowerCase()} · ${statusLabel(value.labs.status)} · ${channelsForPlan(value.labs.plan)}` : "Sin acceso",
      body: (
        <div className="grid gap-4">
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            Estado comercial
            <select
              aria-label="Estado comercial de Vase Labs"
              disabled={!value.labs && orderedLabsPlans.length === 0}
              value={value.labs?.status ?? "OFF"}
              onChange={(event) => {
                if (event.target.value === "OFF") return setProduct("labs", null);
                const fallback = value.labs ?? defaultLabsPlan;
                if (fallback) setProduct("labs", { submoduleId: fallback.submoduleId, plan: fallback.plan, status: event.target.value as CommercialStatus });
              }}
              className={inputClass}
            >
              <option value="OFF">Sin acceso</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Activo</option>
            </select>
          </label>
          {value.labs ? (
            <button
              type="button"
              aria-label="Quitar acceso a Vase Labs"
              onClick={() => setProduct("labs", null)}
              className="justify-self-start rounded-full border border-[var(--danger)]/30 px-4 py-2 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
            >
              Quitar acceso a Vase Labs
            </button>
          ) : null}
          {starterPlanMissing ? (
            <p role="status" className="rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-sm text-[var(--foreground)]">
              Starter no está disponible en el catálogo. Al habilitar Vase Labs se usará {defaultLabsPlan?.label}, el primer plan disponible en el orden oficial.
            </p>
          ) : null}
          {orderedLabsPlans.length === 0 ? (
            <p role="alert" className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">
              No hay planes de Vase Labs disponibles. Corregí el catálogo antes de habilitar el producto.
            </p>
          ) : null}
          <fieldset className="grid gap-2" disabled={!value.labs}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Un único plan</legend>
            {orderedLabsPlans.map((option) => (
              <label key={option.plan} className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] p-3 transition has-[:checked]:border-[var(--accent-strong)] has-[:checked]:bg-[color-mix(in_srgb,var(--accent-strong)_7%,transparent)]">
                <input
                  type="radio"
                  name="labs-plan"
                  value={option.plan}
                  checked={value.labs?.plan === option.plan}
                  onChange={() => setProduct("labs", { submoduleId: option.submoduleId, plan: option.plan, status: value.labs?.status ?? "TRIAL" })}
                  className="mt-1 h-4 w-4 text-[var(--accent-strong)]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--foreground)]">{option.label}</span>
                  <span className="block text-xs text-[var(--muted)]">{channelsForPlan(option.plan)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      ),
    },
    {
      key: "rest",
      title: "Vase Rest",
      icon: UtensilsCrossed,
      summary: value.rest ? `${restPricingVersions.find((option) => option.id === value.rest?.pricingVersionId)?.plan ?? "Plan"} · ${statusLabel(value.rest.status)} · acceso a Proyectos` : "Sin acceso",
      body: (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            Estado comercial
            <select
              aria-label="Estado comercial de Vase Rest"
              value={value.rest?.status ?? "OFF"}
              onChange={(event) => {
                if (event.target.value === "OFF") return setProduct("rest", null);
                const pricingVersionId = value.rest?.pricingVersionId ?? publishedRestPricingVersions[0]?.id;
                if (pricingVersionId) setProduct("rest", { pricingVersionId, status: event.target.value as CommercialStatus });
              }}
              className={inputClass}
            >
              <option value="OFF">Sin acceso</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Activo</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            Plan publicado
            <select
              aria-label="Plan publicado de Vase Rest"
              value={value.rest?.pricingVersionId ?? ""}
              disabled={!value.rest}
              onChange={(event) => setProduct("rest", { pricingVersionId: event.target.value, status: value.rest?.status ?? "TRIAL" })}
              className={inputClass}
            >
              <option value="">Elegí una versión</option>
              {restPricingVersions.map((option) => {
                const isCurrent = option.id === value.rest?.pricingVersionId;
                return <option key={option.id} value={option.id} disabled={option.status !== "PUBLISHED" && !isCurrent}>{pricingLabel(option, isCurrent)}</option>;
              })}
            </select>
          </label>
          {publishedRestPricingVersions.length === 0 ? <p className="sm:col-span-2 text-sm text-[var(--danger)]">No hay planes publicados. Publicá uno en Vase Rest antes de habilitar un acceso nuevo.</p> : null}
          {value.rest ? <p className="sm:col-span-2 text-sm text-[var(--muted)]">Al guardar se sincronizan contrato, límites del plan y acceso real desde Proyectos.</p> : null}
        </div>
      ),
    },
    ...(managementAvailable ? [{
      key: "management",
      title: "Vase Management",
      icon: Settings2,
      summary: value.management ? statusLabel(value.management.status) : "Sin acceso",
      body: (
        <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
          Estado comercial
          <select
            value={value.management?.status ?? "OFF"}
            onChange={(event) => setProduct("management", event.target.value === "OFF" ? null : { status: event.target.value as CommercialStatus })}
            className={inputClass}
          >
            <option value="OFF">Sin acceso</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Activo</option>
          </select>
        </label>
      ),
    }] : []),
  ];

  return (
    <section className="grid gap-4" aria-label="Accesos comerciales del cliente">
      <header className="rounded-3xl border border-[color-mix(in_srgb,var(--accent-strong)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent-strong)_5%,var(--surface))] p-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">{owner.name || "Nuevo cliente"}</p>
        <p className="text-sm text-[var(--muted)]">{owner.email || "Completá el email en Identidad"}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">Owner de la cuenta · configuración automática</p>
      </header>

      <div className="grid gap-3">
        {cards.map((card) => {
          const open = Boolean(expanded[card.key]);
          const regionId = `${baseId}-${card.key}`;
          const Icon = card.icon;
          return (
            <article key={card.key} className={productCardClass}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={regionId}
                onClick={() => setExpanded((current) => ({ ...current, [card.key]: !open }))}
                className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent-strong)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--accent-strong)_10%,transparent)] text-[var(--accent-strong)]"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[var(--foreground)]">{card.title}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">{card.summary}</span>
                </span>
                <ChevronDown className={`h-5 w-5 text-[var(--muted)] transition ${open ? "rotate-180" : ""}`} />
              </button>
              <div id={regionId} role="region" aria-label={`Configurar ${card.title}`} hidden={!open} className="border-t border-[var(--border-subtle)] p-4">
                {card.body}
              </div>
            </article>
          );
        })}
      </div>

      {error ? <p role="alert" className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-55"
      >
        {pending ? "Guardando accesos…" : "Guardar accesos"}
      </button>
    </section>
  );
}

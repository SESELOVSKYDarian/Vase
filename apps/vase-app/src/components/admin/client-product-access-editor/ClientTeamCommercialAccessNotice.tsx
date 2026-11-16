"use client";

// Parte de client-product-access-editor.tsx: BusinessSubmoduleCatalogItem, LabsPlanCatalogItem, RestPricingVersionOption, Props, labsPlanOrder, serializeClientProductAccessEnvelope y más.
import { type ClientProductAccess, type CommercialStatus, type LabsEntitlementPlan } from "@/lib/admin/client-product-access";
import { type BusinessFeatureCatalogItem } from "@/components/admin/business-feature-editor";

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

export type Props = {
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

export const labsPlanOrder: LabsEntitlementPlan[] = ["STARTER", "PRO", "GROWTH"];

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

export const productCardClass = "overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm";
export const inputClass = "min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-strong)_18%,transparent)]";

export function statusLabel(status: CommercialStatus) {
  return status === "TRIAL" ? "Trial" : "Activo";
}

export function channelsForPlan(plan: LabsEntitlementPlan) {
  if (plan === "STARTER") return "WhatsApp";
  if (plan === "PRO") return "WhatsApp + Instagram";
  return "WhatsApp + Instagram + Facebook Messenger";
}

export function pricingLabel(option: RestPricingVersionOption, isCurrent: boolean) {
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

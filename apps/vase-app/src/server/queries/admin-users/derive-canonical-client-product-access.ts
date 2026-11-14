// Parte de admin-users.ts: emptyProductAccess, CanonicalCommercialStatus, CanonicalProductAccessInput, entitledCommercialStatuses, businessSubmoduleOrder, scalarGrantValue y más.
import { Prisma } from "@prisma/client";
import { type ClientProductAccess } from "@/lib/admin/client-product-access";

export const emptyProductAccess: ClientProductAccess = {
  business: null,
  labs: null,
  rest: null,
  management: null,
};

export type CanonicalCommercialStatus = "TRIAL" | "ACTIVE" | "SUSPENDED";
export type CanonicalProductAccessInput = {
  tenantStatus: "ACTIVE" | "TRIAL" | "SUSPENDED" | null;
  membershipStatus: "ACTIVE" | "INVITED" | "SUSPENDED" | null;
  modules: Array<{ id: string; product: "BUSINESS" | "LABS" | "MANAGEMENT" | "REST" }>;
  ownerModuleAccesses: Array<{ moduleId: string; isActive: boolean }>;
  tenantModules: Array<{ moduleId: string; isActive: boolean; commercialStatus: CanonicalCommercialStatus }>;
  tenantSubmodules: Array<{
    submoduleId: string;
    moduleId: string;
    key: string;
    isActive: boolean;
    commercialStatus: CanonicalCommercialStatus;
  }>;
  featureGrants: Array<{
    featureId: string;
    enabled: boolean;
    value: unknown;
    submoduleId: string | null;
  }>;
  businessFeatures: Array<{ id: string; submoduleId: string | null }>;
  restContract: { pricingVersionId: string; status: string; pricingStatus: string } | null;
  storedAccess: ClientProductAccess | null;
};

export const entitledCommercialStatuses = new Set<CanonicalCommercialStatus>(["TRIAL", "ACTIVE"]);
export const businessSubmoduleOrder = new Map([["plantilla", 0], ["personalizado", 1]]);

export function scalarGrantValue(value: unknown) {
  return typeof value === "boolean" || typeof value === "number" || typeof value === "string" ? value : null;
}

/**
 * Projects the commercial editor value from configured entitlement relations.
 * Runtime suspension is intentionally independent: it blocks product use without
 * erasing the Owner's configured products, plans, limits, or feature overrides.
 */
export function deriveCanonicalClientProductAccess(input: CanonicalProductAccessInput): ClientProductAccess {
  const moduleFor = (product: CanonicalProductAccessInput["modules"][number]["product"]) =>
    input.modules.find((module) => module.product === product);
  const moduleIsConfigured = (product: CanonicalProductAccessInput["modules"][number]["product"]) => {
    const catalogModule = moduleFor(product);
    if (!catalogModule) return false;
    const relation = input.tenantModules.find((row) => row.moduleId === catalogModule.id);
    return Boolean(relation?.isActive && entitledCommercialStatuses.has(relation.commercialStatus));
  };

  const businessModule = moduleFor("BUSINESS");
  const activeBusinessSubmodules = moduleIsConfigured("BUSINESS") && businessModule
    ? input.tenantSubmodules
        .filter((row) =>
          row.moduleId === businessModule.id &&
          (row.key === "plantilla" || row.key === "personalizado") &&
          row.isActive &&
          entitledCommercialStatuses.has(row.commercialStatus))
        .sort((left, right) =>
          (businessSubmoduleOrder.get(left.key) ?? 99) - (businessSubmoduleOrder.get(right.key) ?? 99))
    : [];
  const activeBusinessIds = new Set(activeBusinessSubmodules.map((row) => row.submoduleId));
  const featureCatalog = new Map(input.businessFeatures.map((feature) => [feature.id, feature]));
  const relationalGrantIds = new Set(input.featureGrants.map((grant) => grant.featureId));
  const storedFeatureOverrides = input.storedAccess?.business?.submodules.flatMap((submodule) =>
    submodule.features.map((feature) => ({ ...feature, storedSubmoduleId: submodule.id }))) ?? [];

  const business = activeBusinessSubmodules.length ? {
    submodules: activeBusinessSubmodules.map((row, index) => {
      const grants = input.featureGrants
        .filter((grant) => {
          const catalog = featureCatalog.get(grant.featureId);
          return Boolean(catalog) && (
            (catalog?.submoduleId === row.submoduleId && grant.submoduleId === row.submoduleId) ||
            (catalog?.submoduleId === null && grant.submoduleId === null && index === 0)
          );
        })
        .map((grant) => ({
          featureId: grant.featureId,
          enabled: grant.enabled,
          value: scalarGrantValue(grant.value),
        }));
      const fallback = storedFeatureOverrides.filter((override) => {
        if (relationalGrantIds.has(override.featureId)) return false;
        const catalog = featureCatalog.get(override.featureId);
        if (!catalog) return false;
        return catalog.submoduleId === row.submoduleId ||
          (catalog.submoduleId === null && index === 0 && activeBusinessIds.has(override.storedSubmoduleId));
      }).map((override) => ({
        featureId: override.featureId,
        enabled: override.enabled,
        value: override.value,
      }));
      return {
        id: row.submoduleId,
        key: row.key as "plantilla" | "personalizado",
        status: row.commercialStatus === "TRIAL" ? "TRIAL" as const : "ACTIVE" as const,
        features: [...grants, ...fallback],
      };
    }),
  } : null;

  const labsModule = moduleFor("LABS");
  const labsRelation = moduleIsConfigured("LABS") && labsModule
    ? ["growth", "pro", "starter"].map((plan) => input.tenantSubmodules.find((row) =>
        row.moduleId === labsModule.id &&
        row.key.toLowerCase() === plan &&
        row.isActive &&
        entitledCommercialStatuses.has(row.commercialStatus))).find(Boolean)
    : undefined;
  const labs = labsRelation ? {
    submoduleId: labsRelation.submoduleId,
    plan: labsRelation.key.toUpperCase() as "STARTER" | "PRO" | "GROWTH",
    status: labsRelation.commercialStatus === "TRIAL" ? "TRIAL" as const : "ACTIVE" as const,
  } : null;

  const restContractConfigured = input.restContract?.status === "ACTIVE" || input.restContract?.status === "TRIAL";
  const rest = moduleIsConfigured("REST") && input.restContract && restContractConfigured
    ? {
        pricingVersionId: input.restContract.pricingVersionId,
        status: input.restContract.status as "ACTIVE" | "TRIAL",
      }
    : null;
  const managementModuleRelation = moduleIsConfigured("MANAGEMENT")
    ? input.tenantModules.find((row) => row.moduleId === moduleFor("MANAGEMENT")?.id)
    : undefined;
  const management = managementModuleRelation ? {
    status: managementModuleRelation.commercialStatus === "TRIAL" ? "TRIAL" as const : "ACTIVE" as const,
  } : null;

  return { business, labs, rest, management };
}

export type OwnerTenantMembership<Tenant extends { id: string; primaryOwnerUserId?: string | null }> = {
  role: "OWNER" | "MANAGER" | "MEMBER";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  tenant: Tenant;
};

export function resolveAdminOwnerTenantContext<Tenant extends { id: string; primaryOwnerUserId?: string | null }>(
  primaryOwnedTenant: Tenant | null,
  memberships: readonly OwnerTenantMembership<Tenant>[],
) {
  if (primaryOwnedTenant) {
    const membership = memberships.find((entry) =>
      entry.role === "OWNER" && entry.tenant.id === primaryOwnedTenant.id) ?? null;
    return { tenant: primaryOwnedTenant, membership };
  }

  const legacyOwnerMemberships = memberships.filter((entry) =>
    entry.role === "OWNER" && entry.tenant.primaryOwnerUserId == null);
  if (legacyOwnerMemberships.length !== 1) return null;
  return {
    tenant: legacyOwnerMemberships[0].tenant,
    membership: legacyOwnerMemberships[0],
  };
}

export function resolveAdminClientAccountContext<Tenant extends { id: string; primaryOwnerUserId?: string | null }>(
  primaryOwnedTenant: Tenant | null,
  memberships: readonly OwnerTenantMembership<Tenant>[],
) {
  const ownerContext = resolveAdminOwnerTenantContext(primaryOwnedTenant, memberships);
  if (ownerContext) return { kind: "OWNER" as const, ...ownerContext };
  if (memberships.some((membership) => membership.role === "OWNER")) {
    return { kind: "UNASSIGNED" as const, tenant: null, membership: null };
  }
  const teamMembership = memberships.find((membership) =>
    membership.role === "MANAGER" || membership.role === "MEMBER") ?? null;
  if (teamMembership) return { kind: "TEAM" as const, tenant: teamMembership.tenant, membership: teamMembership };
  return { kind: "UNASSIGNED" as const, tenant: null, membership: null };
}

export const adminOwnerTenantSelect = Prisma.validator<Prisma.TenantSelect>()({
  id: true,
  primaryOwnerUserId: true,
  name: true,
  slug: true,
  accountName: true,
  industry: true,
  status: true,
  subscription: { select: { businessProjectLimit: true, teamMemberLimit: true } },
  memberships: { select: { userId: true, role: true, status: true } },
  invitations: { where: { status: "PENDING" }, select: { id: true } },
  tenantModules: {
    select: { moduleId: true, isActive: true, commercialStatus: true },
  },
  tenantSubmodules: {
    select: {
      isActive: true,
      commercialStatus: true,
      submodule: { select: { id: true, moduleId: true, key: true } },
    },
  },
  featureGrants: {
    select: {
      featureId: true,
      enabled: true,
      value: true,
      feature: { select: { moduleId: true, submoduleId: true } },
    },
  },
  restContract: {
    select: {
      pricingVersionId: true,
      status: true,
      pricingVersion: { select: { status: true } },
    },
  },
});

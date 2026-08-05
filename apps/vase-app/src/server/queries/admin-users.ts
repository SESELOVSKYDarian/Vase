import { Prisma } from "@prisma/client";
import type { ClientProductAccess } from "@/lib/admin/client-product-access";
import { getUserAccessModuleLabel, inferUiRoleFromStoredRoles } from "@/lib/admin/user-access";
import { parseStoredClientProductAccess } from "@/lib/admin/client-product-access";
import { prisma } from "@/lib/db/prisma";
import { serializeModuleFeature } from "@/server/queries/modules-admin";

const emptyProductAccess: ClientProductAccess = {
  business: null,
  labs: null,
  rest: null,
  management: null,
};

type CanonicalCommercialStatus = "TRIAL" | "ACTIVE" | "SUSPENDED";
type CanonicalProductAccessInput = {
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

const entitledCommercialStatuses = new Set<CanonicalCommercialStatus>(["TRIAL", "ACTIVE"]);
const businessSubmoduleOrder = new Map([["plantilla", 0], ["personalizado", 1]]);

function scalarGrantValue(value: unknown) {
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

type OwnerTenantMembership<Tenant extends { id: string; primaryOwnerUserId?: string | null }> = {
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

const adminOwnerTenantSelect = Prisma.validator<Prisma.TenantSelect>()({
  id: true,
  primaryOwnerUserId: true,
  name: true,
  slug: true,
  accountName: true,
  industry: true,
  status: true,
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

export async function getAdminUsersWorkspaceData() {
  const [usersRaw, modulesRaw, clientAccountsRaw, restPricingRaw] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isDisabled: true,
        disabledAt: true,
        disabledReason: true,
        platformRole: true,
        clientAccessConfig: true,
        appRoles: { select: { role: { select: { key: true } } } },
        moduleAccesses: { select: { moduleId: true, isActive: true } },
        primaryOwnedTenant: { select: adminOwnerTenantSelect },
        memberships: {
          orderBy: [{ updatedAt: "desc" }],
          select: {
            role: true,
            status: true,
            tenant: { select: adminOwnerTenantSelect },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    }),
    prisma.module.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        product: true,
        pricing: {
          orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
          select: { price: true, currency: true, type: true, isActive: true },
        },
        features: {
          where: { isActive: true, submoduleId: null },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true, key: true, name: true, description: true, valueType: true,
            trialDefault: true, activeDefault: true, minValue: true, maxValue: true,
            sortOrder: true, isActive: true,
          },
        },
        submodules: {
          where: { isActive: true },
          select: {
            id: true,
            key: true,
            name: true,
            pricing: {
              orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
              select: { price: true, currency: true, type: true, isActive: true },
            },
            features: {
              where: { isActive: true },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              select: {
                id: true, key: true, name: true, description: true, valueType: true,
                trialDefault: true, activeDefault: true, minValue: true, maxValue: true,
                sortOrder: true, isActive: true,
              },
            },
          },
          orderBy: [{ name: "asc" }],
        },
      },
      orderBy: [{ product: "asc" }, { name: "asc" }],
    }),
    prisma.clientAccount.findMany({
      select: {
        id: true,
        name: true,
        companyName: true,
        managedByUserId: true,
        email: true,
        updatedAt: true,
        payments: {
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true, concept: true, category: true, status: true, totalAmount: true,
            paidAmount: true, moduleId: true, submoduleId: true, dueAt: true, paidAt: true, createdAt: true,
          },
        },
      },
    }),
    prisma.restPricingVersion.findMany({
      where: { status: { in: ["PUBLISHED", "ARCHIVED"] } },
      orderBy: [{ plan: "asc" }, { version: "desc" }],
      select: {
        id: true, plan: true, version: true, currency: true, monthlyPrice: true,
        branchLimit: true, localEmployeeLimit: true, deviceLimit: true, edgeLimit: true, status: true,
      },
    }),
  ]);

  const users = usersRaw.map((user) => {
    const appRoles = user.appRoles.map((entry) => entry.role.key);
    const uiRole = inferUiRoleFromStoredRoles({ platformRole: user.platformRole, appRoles });
    const userAccounts = clientAccountsRaw.filter((account) => account.managedByUserId === user.id || account.email === user.email);
    const primaryAccount = userAccounts.slice().sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    const paymentTotals = userAccounts.reduce((acc, account) => {
      const total = account.payments.reduce((sum, payment) => sum + Number(payment.totalAmount), 0);
      const paid = account.payments.reduce((sum, payment) => sum + Number(payment.paidAmount), 0);
      return { total: acc.total + total, paid: acc.paid + paid };
    }, { total: 0, paid: 0 });
    const debt = Math.max(0, paymentTotals.total - paymentTotals.paid);
    const paidPercent = paymentTotals.total > 0 ? Math.min(100, Math.round((paymentTotals.paid / paymentTotals.total) * 100)) : 0;
    const paymentSummary = paymentTotals.total <= 0
      ? "Sin pagos registrados"
      : debt <= 0
        ? "100% pagado"
        : `${paidPercent}% pagado · falta ${new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(debt)}`;
    const clientAccountContext = resolveAdminClientAccountContext(user.primaryOwnedTenant, user.memberships);
    const ownerContext = clientAccountContext.kind === "OWNER" ? clientAccountContext : null;
    const displayMembership = clientAccountContext.membership;
    const tenant = clientAccountContext.tenant;
    const teamMembers = tenant?.memberships.filter((membership) => membership.role !== "OWNER") ?? [];
    const derivedProductAccess = uiRole === "cliente" && ownerContext && tenant
      ? deriveCanonicalClientProductAccess({
          tenantStatus: tenant.status,
          membershipStatus: ownerContext.membership?.status ?? null,
          modules: modulesRaw.map((module) => ({ id: module.id, product: module.product })),
          ownerModuleAccesses: user.moduleAccesses,
          tenantModules: tenant.tenantModules,
          tenantSubmodules: tenant.tenantSubmodules.map((entry) => ({
            submoduleId: entry.submodule.id,
            moduleId: entry.submodule.moduleId,
            key: entry.submodule.key,
            isActive: entry.isActive,
            commercialStatus: entry.commercialStatus,
          })),
          featureGrants: tenant.featureGrants.map((grant) => ({
            featureId: grant.featureId,
            enabled: grant.enabled,
            value: grant.value,
            submoduleId: grant.feature.submoduleId,
          })),
          businessFeatures: modulesRaw
            .filter((module) => module.product === "BUSINESS")
            .flatMap((module) => [
              ...module.features.map((feature) => ({ id: feature.id, submoduleId: null })),
              ...module.submodules.flatMap((submodule) =>
                submodule.features.map((feature) => ({ id: feature.id, submoduleId: submodule.id }))),
            ]),
          restContract: tenant.restContract ? {
            pricingVersionId: tenant.restContract.pricingVersionId,
            status: tenant.restContract.status,
            pricingStatus: tenant.restContract.pricingVersion.status,
          } : null,
          storedAccess: parseStoredClientProductAccess(user.clientAccessConfig),
        })
      : emptyProductAccess;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isDisabled: user.isDisabled,
      disabledAt: user.disabledAt,
      disabledReason: user.disabledReason,
      uiRole,
      clientAccountKind: clientAccountContext.kind,
      moduleIds: user.moduleAccesses.filter((entry) => entry.isActive).map((entry) => entry.moduleId),
      tenantId: tenant?.id ?? null,
      tenantName: tenant?.name ?? null,
      tenantSlug: tenant?.slug ?? null,
      accountName: tenant?.accountName ?? null,
      industry: tenant?.industry ?? null,
      tenantStatus: tenant?.status ?? null,
      tenantRole: displayMembership?.role ?? null,
      membershipStatus: displayMembership?.status ?? null,
      paymentSummary,
      primaryClientAccountId: primaryAccount?.id ?? null,
      paymentHistory: userAccounts.flatMap((account) => account.payments.map((payment) => ({
        id: payment.id,
        accountLabel: account.companyName ? `${account.name} · ${account.companyName}` : account.name,
        moduleId: payment.moduleId,
        submoduleId: payment.submoduleId,
        moduleLabel: payment.moduleId ? modulesRaw.find((module) => module.id === payment.moduleId)?.name ?? null : null,
        submoduleLabel: payment.submoduleId
          ? modulesRaw.flatMap((module) => module.submodules).find((submodule) => submodule.id === payment.submoduleId)?.name ?? null
          : null,
        concept: payment.concept,
        category: payment.category,
        status: payment.status,
        totalAmount: Number(payment.totalAmount),
        paidAmount: Number(payment.paidAmount),
        pendingAmount: Math.max(0, Number(payment.totalAmount) - Number(payment.paidAmount)),
        dueAt: payment.dueAt,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20),
      productAccess: derivedProductAccess,
      teamSummary: {
        members: teamMembers.length,
        active: teamMembers.filter((membership) => membership.status === "ACTIVE").length,
        suspended: teamMembers.filter((membership) => membership.status === "SUSPENDED").length,
        pendingInvitations: tenant?.invitations.length ?? 0,
      },
    };
  });

  const modules = modulesRaw.map((module) => ({
    id: module.id,
    name: getUserAccessModuleLabel(module.id),
    product: module.product,
    features: module.features.map(serializeModuleFeature),
    pricing: module.pricing.map((entry) => ({ price: Number(entry.price), currency: entry.currency, type: entry.type, isActive: entry.isActive })),
    submodules: module.submodules.map((submodule) => ({
      id: submodule.id,
      key: submodule.key,
      name: submodule.name,
      features: submodule.features.map(serializeModuleFeature),
      pricing: submodule.pricing.map((entry) => ({ price: Number(entry.price), currency: entry.currency, type: entry.type, isActive: entry.isActive })),
    })),
  }));

  return {
    users,
    modules,
    restPricingVersions: restPricingRaw.map((version) => ({
      ...version,
      monthlyPrice: Number(version.monthlyPrice),
      status: version.status as "PUBLISHED" | "ARCHIVED",
    })),
  };
}

export type AdminUsersWorkspaceData = Awaited<ReturnType<typeof getAdminUsersWorkspaceData>>;

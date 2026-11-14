// Parte de admin-users.ts: getAdminUsersWorkspaceData, AdminUsersWorkspaceData.
import { getUserAccessModuleLabel, inferUiRoleFromStoredRoles } from "@/lib/admin/user-access";
import { parseStoredClientProductAccess } from "@/lib/admin/client-product-access";
import { prisma } from "@/lib/db/prisma";
import { serializeModuleFeature } from "@/server/queries/modules-admin";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { adminOwnerTenantSelect, deriveCanonicalClientProductAccess, emptyProductAccess, resolveAdminClientAccountContext } from "./derive-canonical-client-product-access";

export async function getAdminUsersWorkspaceData() {
  // The Admin editor builds its product selectors from this query. Keep the
  // database catalog aligned with the source definitions before reading it,
  // including on deployments where the seed command was not run.
  await ensureModuleCatalogSynced();

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
      businessProjectLimit: tenant?.subscription?.businessProjectLimit ?? 1,
      teamMemberLimit: tenant?.subscription?.teamMemberLimit ?? 3,
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

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
        moduleAccesses: { where: { isActive: true }, select: { moduleId: true } },
        memberships: {
          orderBy: [{ updatedAt: "desc" }],
          select: {
            role: true,
            status: true,
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                accountName: true,
                industry: true,
                status: true,
                memberships: { select: { userId: true, role: true, status: true } },
                invitations: { where: { status: "PENDING" }, select: { id: true } },
                tenantModules: {
                  where: { isActive: true, commercialStatus: { in: ["TRIAL", "ACTIVE"] } },
                  select: { moduleId: true, commercialStatus: true },
                },
                tenantSubmodules: {
                  where: { isActive: true, commercialStatus: { in: ["TRIAL", "ACTIVE"] } },
                  select: {
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
                restContract: { select: { pricingVersionId: true, status: true } },
              },
            },
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
      where: { status: "PUBLISHED" },
      orderBy: [{ plan: "asc" }, { version: "desc" }],
      select: {
        id: true, plan: true, version: true, currency: true, monthlyPrice: true,
        branchLimit: true, localEmployeeLimit: true, deviceLimit: true, edgeLimit: true,
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
    const primaryMembership = user.memberships.find((entry) => entry.role === "OWNER" && entry.status === "ACTIVE")
      ?? user.memberships.find((entry) => entry.status === "ACTIVE")
      ?? user.memberships[0]
      ?? null;
    const teamMembers = primaryMembership?.tenant.memberships.filter((membership) => membership.role !== "OWNER") ?? [];
    const storedProductAccess = parseStoredClientProductAccess(user.clientAccessConfig);
    const tenant = primaryMembership?.tenant;
    const activeModuleIds = new Set([
      ...user.moduleAccesses.map((entry) => entry.moduleId),
      ...(tenant?.tenantModules.map((entry) => entry.moduleId) ?? []),
    ]);
    const businessModule = modulesRaw.find((module) => module.product === "BUSINESS");
    const labsModule = modulesRaw.find((module) => module.product === "LABS");
    const restModule = modulesRaw.find((module) => module.product === "REST");
    const managementModule = modulesRaw.find((module) => module.product === "MANAGEMENT");
    const activeBusinessSubmodules = (tenant?.tenantSubmodules ?? []).filter((entry) =>
      entry.submodule.moduleId === businessModule?.id &&
      (entry.submodule.key === "plantilla" || entry.submodule.key === "personalizado"));
    const businessSubmoduleIds = new Set(activeBusinessSubmodules.map((entry) => entry.submodule.id));
    const scalarGrantValue = (grantValue: unknown) =>
      typeof grantValue === "boolean" || typeof grantValue === "number" || typeof grantValue === "string" ? grantValue : null;
    const derivedBusiness = activeModuleIds.has(businessModule?.id ?? "")
      ? {
          submodules: activeBusinessSubmodules.map((entry) => ({
            id: entry.submodule.id,
            key: entry.submodule.key as "plantilla" | "personalizado",
            status: entry.commercialStatus === "TRIAL" ? "TRIAL" as const : "ACTIVE" as const,
            features: (tenant?.featureGrants ?? [])
              .filter((grant) => grant.feature.moduleId === businessModule?.id && (
                grant.feature.submoduleId === entry.submodule.id ||
                (grant.feature.submoduleId === null && businessSubmoduleIds.size === 1)
              ))
              .map((grant) => ({
                featureId: grant.featureId,
                enabled: grant.enabled,
                value: scalarGrantValue(grant.value),
              })),
          })),
        }
      : null;
    const activeLabsSubmodule = (tenant?.tenantSubmodules ?? []).find((entry) =>
      entry.submodule.moduleId === labsModule?.id && ["starter", "pro", "growth"].includes(entry.submodule.key.toLowerCase()));
    const derivedLabs = activeModuleIds.has(labsModule?.id ?? "") && activeLabsSubmodule
      ? {
          submoduleId: activeLabsSubmodule.submodule.id,
          plan: activeLabsSubmodule.submodule.key.toUpperCase() as "STARTER" | "PRO" | "GROWTH",
          status: activeLabsSubmodule.commercialStatus === "TRIAL" ? "TRIAL" as const : "ACTIVE" as const,
        }
      : null;
    const derivedRest = activeModuleIds.has(restModule?.id ?? "") && tenant?.restContract &&
      (tenant.restContract.status === "ACTIVE" || tenant.restContract.status === "TRIAL")
      ? {
          pricingVersionId: tenant.restContract.pricingVersionId,
          status: tenant.restContract.status,
        }
      : null;
    const managementState = tenant?.tenantModules.find((entry) => entry.moduleId === managementModule?.id);
    const derivedProductAccess: ClientProductAccess = uiRole === "cliente" ? {
      business: derivedBusiness,
      labs: derivedLabs,
      rest: derivedRest,
      management: managementState ? {
        status: managementState.commercialStatus === "TRIAL" ? "TRIAL" as const : "ACTIVE" as const,
      } : null,
    } : emptyProductAccess;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isDisabled: user.isDisabled,
      disabledAt: user.disabledAt,
      disabledReason: user.disabledReason,
      uiRole,
      moduleIds: user.moduleAccesses.map((entry) => entry.moduleId),
      tenantId: primaryMembership?.tenant.id ?? null,
      tenantName: primaryMembership?.tenant.name ?? null,
      tenantSlug: primaryMembership?.tenant.slug ?? null,
      accountName: primaryMembership?.tenant.accountName ?? null,
      industry: primaryMembership?.tenant.industry ?? null,
      tenantStatus: primaryMembership?.tenant.status ?? null,
      tenantRole: primaryMembership?.role ?? null,
      membershipStatus: primaryMembership?.status ?? null,
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
      productAccess: storedProductAccess ?? derivedProductAccess,
      teamSummary: {
        members: teamMembers.length,
        active: teamMembers.filter((membership) => membership.status === "ACTIVE").length,
        suspended: teamMembers.filter((membership) => membership.status === "SUSPENDED").length,
        pendingInvitations: primaryMembership?.tenant.invitations.length ?? 0,
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
    })),
  };
}

export type AdminUsersWorkspaceData = Awaited<ReturnType<typeof getAdminUsersWorkspaceData>>;

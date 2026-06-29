import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminMasterUsersWorkspace } from "@/components/admin/admin-master-users-workspace";
import { inferUiRoleFromStoredRoles } from "@/lib/admin/user-access";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function AdminUsersPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const [usersRaw, modulesRaw, clientAccountsRaw] = await Promise.all([
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
        appRoles: {
          select: {
            role: {
              select: { key: true },
            },
          },
        },
        moduleAccesses: {
          where: { isActive: true },
          select: { moduleId: true },
        },
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
          select: {
            price: true,
            currency: true,
            type: true,
            isActive: true,
          },
        },
        submodules: {
          select: {
            id: true,
            key: true,
            name: true,
            pricing: {
              orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
              select: {
                price: true,
                currency: true,
                type: true,
                isActive: true,
              },
            },
          },
          orderBy: { name: "asc" },
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
            id: true,
            concept: true,
            category: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            moduleId: true,
            submoduleId: true,
            dueAt: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const users = usersRaw.map((user) => {
    const appRoles = user.appRoles.map((entry) => entry.role.key);
    const uiRole = inferUiRoleFromStoredRoles({
      platformRole: user.platformRole,
      appRoles,
    });
    const userAccounts = clientAccountsRaw.filter(
      (account) => account.managedByUserId === user.id || account.email === user.email,
    );
    const primaryAccount = userAccounts
      .slice()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    const paymentTotals = userAccounts.reduce(
      (acc, account) => {
        const accountTotal = account.payments.reduce((sum, payment) => sum + Number(payment.totalAmount), 0);
        const accountPaid = account.payments.reduce((sum, payment) => sum + Number(payment.paidAmount), 0);
        return { total: acc.total + accountTotal, paid: acc.paid + accountPaid };
      },
      { total: 0, paid: 0 },
    );
    const debt = Math.max(0, paymentTotals.total - paymentTotals.paid);
    const paidPercent = paymentTotals.total > 0 ? Math.min(100, Math.round((paymentTotals.paid / paymentTotals.total) * 100)) : 0;
    const paymentSummary =
      paymentTotals.total <= 0
        ? "Sin pagos registrados"
        : debt <= 0
          ? "100% pagado"
          : `${paidPercent}% pagado · falta ${new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(debt)}`;

    const primaryMembership = user.memberships.find((entry) => entry.status === "ACTIVE") ?? user.memberships[0] ?? null;
    const rawClientAccessConfig = user.clientAccessConfig as
      | {
          tenantPlan?: "TRIAL" | "PRO";
          proSubmoduleId?: string | null;
          proSubmoduleIds?: string[] | null;
          tenantName?: string | null;
          tenantSlug?: string | null;
          accountName?: string | null;
          industry?: string | null;
          tenantStatus?: "ACTIVE" | "TRIAL" | "SUSPENDED" | null;
          tenantRole?: "OWNER" | "MANAGER" | "MEMBER" | null;
          membershipStatus?: "ACTIVE" | "INVITED" | "SUSPENDED" | null;
          moduleLimits?: Record<string, { pages?: number | null; chatbots?: number | null }>;
        }
      | null;
    const clientAccessConfig = rawClientAccessConfig
        ? {
          tenantPlan: rawClientAccessConfig.tenantPlan ?? "TRIAL",
          proSubmoduleIds:
            rawClientAccessConfig.proSubmoduleIds ??
            (rawClientAccessConfig.proSubmoduleId ? [rawClientAccessConfig.proSubmoduleId] : []),
          tenantName: rawClientAccessConfig.tenantName ?? primaryMembership?.tenant.name ?? "",
          tenantSlug: rawClientAccessConfig.tenantSlug ?? primaryMembership?.tenant.slug ?? "",
          accountName: rawClientAccessConfig.accountName ?? primaryMembership?.tenant.accountName ?? "",
          industry: rawClientAccessConfig.industry ?? primaryMembership?.tenant.industry ?? "",
          tenantStatus: rawClientAccessConfig.tenantStatus ?? primaryMembership?.tenant.status ?? "TRIAL",
          tenantRole: rawClientAccessConfig.tenantRole ?? primaryMembership?.role ?? "OWNER",
          membershipStatus: rawClientAccessConfig.membershipStatus ?? primaryMembership?.status ?? "ACTIVE",
          moduleLimits: Object.fromEntries(
            Object.entries(rawClientAccessConfig.moduleLimits ?? {}).map(([moduleId, limits]) => [
              moduleId,
              {
                pages: limits.pages ?? null,
                chatbots: limits.chatbots ?? null,
              },
            ]),
          ),
        }
      : null;

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
      paymentHistory: userAccounts
        .flatMap((account) =>
          account.payments.map((payment) => ({
            id: payment.id,
            accountLabel: account.companyName ? `${account.name} · ${account.companyName}` : account.name,
            moduleId: payment.moduleId,
            submoduleId: payment.submoduleId,
            moduleLabel: payment.moduleId ? modulesRaw.find((module) => module.id === payment.moduleId)?.name ?? null : null,
            submoduleLabel: payment.submoduleId
              ? modulesRaw
                  .flatMap((module) => module.submodules)
                  .find((submodule) => submodule.id === payment.submoduleId)?.name ?? null
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
          })),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 20),
      clientAccessConfig,
    };
  });

  const modules = modulesRaw.map((module) => ({
    id: module.id,
    name: module.name,
    product: module.product,
    pricing: module.pricing.map((entry) => ({
      price: Number(entry.price),
      currency: entry.currency,
      type: entry.type,
      isActive: entry.isActive,
    })),
    submodules: module.submodules.map((submodule) => ({
      id: submodule.id,
      key: submodule.key,
      name: submodule.name,
      pricing: submodule.pricing.map((entry) => ({
        price: Number(entry.price),
        currency: entry.currency,
        type: entry.type,
        isActive: entry.isActive,
      })),
    })),
  }));

  return (
    <AppShell
      title="Usuarios"
      subtitle="Panel unificado de usuarios, acceso por modulo y cobros del cliente."
      tenantLabel="Admin Master"
    >
      <AdminMasterUsersWorkspace users={users} modules={modules} />
    </AppShell>
  );
}

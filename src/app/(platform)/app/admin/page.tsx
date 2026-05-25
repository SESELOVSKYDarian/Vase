import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getAdminFinanceDashboard } from "@/server/queries/admin-finance";
import { prisma } from "@/lib/db/prisma";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

function lastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { start, end };
}

export default async function AdminPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const thisMonth = monthRange();
  const previousMonth = lastMonthRange();

  const [finance, monthlyPayments, userCount, usersLastMonth, topClientsRaw] = await Promise.all([
    getAdminFinanceDashboard(),
    prisma.clientPayment.findMany({
      where: {
        paidAt: {
          gte: thisMonth.start,
          lt: thisMonth.end,
        },
      },
      include: {
        allocations: {
          include: {
            partnerUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      take: 5000,
    }),
    prisma.user.count(),
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: previousMonth.start,
          lt: previousMonth.end,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.clientPayment.groupBy({
      by: ["clientAccountId"],
      _sum: { paidAmount: true },
      orderBy: {
        _sum: {
          paidAmount: "desc",
        },
      },
      take: 5,
      where: {
        paidAmount: { gt: 0 },
      },
    }),
  ]);

  const monthlyPartnerMap = new Map<string, { name: string; amount: number }>();
  for (const payment of monthlyPayments) {
    for (const allocation of payment.allocations) {
      if (allocation.direction !== "PARTNER_DISTRIBUTION") continue;
      const key = allocation.partnerUserId ?? "no_partner";
      const current = monthlyPartnerMap.get(key);
      const name = allocation.partnerUser?.name ?? "Socio sin asignar";
      const amount = Number(allocation.amount ?? 0);
      if (!current) {
        monthlyPartnerMap.set(key, { name, amount });
      } else {
        monthlyPartnerMap.set(key, { ...current, amount: current.amount + amount });
      }
    }
  }
  const monthlyPartnerEarnings = Array.from(monthlyPartnerMap.values()).sort((a, b) => b.amount - a.amount);

  const topClientIds = topClientsRaw.map((row) => row.clientAccountId);
  const topClientAccounts = await prisma.clientAccount.findMany({
    where: {
      id: { in: topClientIds },
    },
    select: {
      id: true,
      name: true,
      companyName: true,
    },
  });
  const topClientNameById = new Map(topClientAccounts.map((client) => [client.id, client.companyName || client.name]));
  const topClients = topClientsRaw.map((row) => ({
    id: row.clientAccountId,
    name: topClientNameById.get(row.clientAccountId) ?? "Cliente",
    paid: Number(row._sum.paidAmount ?? 0),
  }));

  return (
    <AppShell
      title="Inicio Super Admin"
      subtitle="Vista simplificada con métricas clave para decisión rápida."
      tenantLabel="Admin Master"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <PanelCard title="Fondo real de empresa" description="Fondo bruto menos gastos registrados.">
          <p className={`text-3xl font-semibold ${finance.kpis.realCompanyFund >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {formatMoney(finance.kpis.realCompanyFund)}
          </p>
        </PanelCard>
        <PanelCard title="Usuarios registrados" description="Total de usuarios en plataforma.">
          <p className="text-3xl font-semibold text-[var(--foreground)]">{userCount}</p>
        </PanelCard>
        <PanelCard title="Nuevos (último mes)" description="Usuarios creados en el mes anterior.">
          <p className="text-3xl font-semibold text-[var(--foreground)]">{usersLastMonth.length}</p>
        </PanelCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <PanelCard
          eyebrow="Socios"
          title="Ganancias del mes por socio"
          description="Distribución registrada del mes actual según pagos y allocations."
        >
          {monthlyPartnerEarnings.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No hay ganancias de socios registradas este mes.</p>
          ) : (
            <div className="space-y-3">
              {monthlyPartnerEarnings.map((partner) => (
                <div key={partner.name} className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{partner.name}</p>
                  <p className="text-sm font-semibold text-[var(--accent-strong)]">{formatMoney(partner.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard
          eyebrow="Clientes"
          title="Top 5 clientes que más pagan"
          description="Ranking por monto total abonado."
        >
          {topClients.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No hay pagos suficientes para armar el ranking.</p>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div key={client.id} className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {index + 1}. {client.name}
                  </p>
                  <p className="text-sm font-semibold text-[var(--accent-strong)]">{formatMoney(client.paid)}</p>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Altas recientes"
        title="Quiénes se registraron el último mes"
        description="Últimos usuarios creados en el mes anterior."
      >
        {usersLastMonth.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No hubo registros el último mes.</p>
        ) : (
          <div className="space-y-2">
            {usersLastMonth.map((user) => (
              <div key={user.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">{user.name}</p>
                <p className="text-xs text-[var(--muted)]">{user.email}</p>
              </div>
            ))}
          </div>
        )}
      </PanelCard>
    </AppShell>
  );
}


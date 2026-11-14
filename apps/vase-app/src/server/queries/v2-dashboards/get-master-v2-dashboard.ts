// Parte de v2-dashboards.ts: getMasterV2Dashboard.
import { prisma } from "@/lib/db/prisma";
import { endOfDay, getProjectCountsSafe, getUpcomingDeliveriesSafe, startOfDay, startOfMonth, startOfYear } from "./get-main-project-safe";

export async function getMasterV2Dashboard() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const financeTrendRanges = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0, 0);
    return { start, end };
  });

  const [
    monthlyPayments,
    yearlyPayments,
    monthlyExpenses,
    projectCounts,
    supportCounts,
    clientsByStatus,
    overdueClientPayments,
    meetingsToday,
    meetingsWeek,
    recentDeployments,
    recentRollbacks,
    activeUsers,
    disabledUsers,
    tenantSuspended,
    membershipSuspended,
    recentDisabledUsers,
    financeTrend,
  ] = await Promise.all([
    prisma.clientPayment.aggregate({
      where: { paidAt: { gte: monthStart, lt: now } },
      _sum: { paidAmount: true },
    }),
    prisma.clientPayment.aggregate({
      where: { paidAt: { gte: yearStart, lt: now } },
      _sum: { paidAmount: true },
    }),
    prisma.expense.aggregate({
      where: { startsAt: { gte: monthStart, lt: now } },
      _sum: { amount: true },
    }),
    getProjectCountsSafe(),
    prisma.supportTicket.groupBy({
      by: ["status", "priority"],
      _count: { _all: true },
      where: {
        status: { in: ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"] },
      },
    }),
    prisma.clientAccount.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.clientPayment.count({
      where: {
        dueAt: { lt: now },
        paidAt: null,
      },
    }),
    prisma.customProjectMeetingBooking.count({
      where: { scheduledStart: { gte: todayStart, lt: todayEnd }, status: "SCHEDULED" },
    }),
    prisma.customProjectMeetingBooking.count({
      where: { scheduledStart: { gte: todayStart, lt: weekEnd }, status: "SCHEDULED" },
    }),
    prisma.auditLog.findMany({
      where: { action: "platform.custom_project_provisioned" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, targetId: true, actorUser: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      where: { action: "platform.custom_project_rollback" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, targetId: true, actorUser: { select: { name: true } } },
    }),
    prisma.user.count({ where: { isDisabled: false } }),
    prisma.user.count({ where: { isDisabled: true } }),
    prisma.tenant.count({ where: { status: "SUSPENDED" } }),
    prisma.membership.count({ where: { status: "SUSPENDED" } }),
    prisma.user.findMany({
      where: { isDisabled: true },
      orderBy: { disabledAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, disabledAt: true, disabledReason: true },
    }),
    Promise.all(
      financeTrendRanges.map(async ({ start, end }) => {
        const [payments, expenses] = await Promise.all([
          prisma.clientPayment.aggregate({
            where: { paidAt: { gte: start, lt: end } },
            _sum: { paidAmount: true },
          }),
          prisma.expense.aggregate({
            where: { startsAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ]);
        return {
          label: new Intl.DateTimeFormat("es-AR", { month: "short" }).format(start),
          ingresos: Number(payments._sum.paidAmount ?? 0),
          gastos: Number(expenses._sum.amount ?? 0),
        };
      }),
    ),
  ]);

  const projectsByStatus = new Map(projectCounts.map((row) => [row.status, row._count._all]));
  const clientsStatusMap = new Map(clientsByStatus.map((row) => [row.status, row._count._all]));

  const ticketsOpen = supportCounts.reduce((acc, row) => acc + row._count._all, 0);
  const ticketsWaitingClient = supportCounts
    .filter((row) => row.status === "WAITING_CUSTOMER")
    .reduce((acc, row) => acc + row._count._all, 0);
  const ticketsCritical = supportCounts
    .filter((row) => row.priority === "URGENT")
    .reduce((acc, row) => acc + row._count._all, 0);

  const ingresosMes = Number(monthlyPayments._sum.paidAmount ?? 0);
  const gastosMes = Number(monthlyExpenses._sum.amount ?? 0);
  const proximasEntregas = await getUpcomingDeliveriesSafe(now, weekEnd);
  return {
    finances: {
      ingresosMes,
      gastosMes,
      gananciaNetaMes: ingresosMes - gastosMes,
      gananciaAnual: Number(yearlyPayments._sum.paidAmount ?? 0),
      hostingPendiente: await prisma.clientPayment.count({
        where: { category: "HOSTING", paidAt: null },
      }),
      mantenimientoPendiente: await prisma.clientPayment.count({
        where: { category: "MAINTENANCE", paidAt: null },
      }),
    },
    projects: {
      activos:
        (projectsByStatus.get("DISCOVERY") ?? 0) +
        (projectsByStatus.get("DESIGN") ?? 0) +
        (projectsByStatus.get("DEVELOPMENT") ?? 0) +
        (projectsByStatus.get("TESTING") ?? 0) +
        (projectsByStatus.get("DEPLOYMENT") ?? 0),
      finalizados: projectsByStatus.get("COMPLETED") ?? 0,
      pausados: projectsByStatus.get("PAUSED") ?? 0,
      proximasEntregas,
    },
    support: {
      abiertos: ticketsOpen,
      vencidos: await prisma.supportTicket.count({
        where: { waitingSince: { lt: new Date(Date.now() - 1000 * 60 * 60 * 48) }, status: { in: ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"] } },
      }),
      criticos: ticketsCritical,
      esperandoCliente: ticketsWaitingClient,
    },
    clients: {
      activos: clientsStatusMap.get("ACTIVE") ?? 0,
      nuevos: await prisma.clientAccount.count({ where: { createdAt: { gte: monthStart, lt: now } } }),
      conPagosVencidos: overdueClientPayments,
    },
    health: {
      activeUsers,
      disabledUsers,
      tenantSuspended,
      membershipSuspended,
      recentDisabledUsers,
    },
    charts: {
      financeTrend,
      accessHealth: [
        { label: "Activos", value: activeUsers, tone: "success" as const },
        { label: "Deshabilitados", value: disabledUsers, tone: "danger" as const },
        { label: "Tenants susp.", value: tenantSuspended, tone: "warning" as const },
        { label: "Membresias susp.", value: membershipSuspended, tone: "info" as const },
      ],
    },
    meetings: {
      hoy: meetingsToday,
      estaSemana: meetingsWeek,
    },
    deployments: {
      ultimos: recentDeployments,
      rollbacksRecientes: recentRollbacks,
    },
  };
}

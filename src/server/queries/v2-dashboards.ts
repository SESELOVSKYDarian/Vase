import { prisma } from "@/lib/db/prisma";

function isMissingProjectStatusColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; meta?: { column?: string } };
  return maybeError.code === "P2022" && maybeError.meta?.column === "vase.Project.status";
}

async function getProjectCountsSafe() {
  try {
    return await prisma.project.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  } catch (error) {
    if (isMissingProjectStatusColumnError(error)) {
      return [];
    }
    throw error;
  }
}

async function getUpcomingDeliveriesSafe(now: Date, weekEnd: Date) {
  try {
    return await prisma.project.count({
      where: { dueAt: { gte: now, lt: weekEnd }, status: { in: ["DEPLOYMENT", "TESTING", "DEVELOPMENT"] } },
    });
  } catch (error) {
    if (isMissingProjectStatusColumnError(error)) {
      return 0;
    }
    throw error;
  }
}

async function getMainProjectSafe(tenantId: string) {
  try {
    return await prisma.project.findFirst({
      where: { tenantId, status: { in: ["DISCOVERY", "DESIGN", "DEVELOPMENT", "TESTING", "DEPLOYMENT", "PENDING"] } },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        updates: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { actorUser: { select: { name: true } } },
        },
      },
    });
  } catch (error) {
    if (isMissingProjectStatusColumnError(error)) {
      return null;
    }
    throw error;
  }
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

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

export async function getClientV2Dashboard(tenantId: string) {
  const now = new Date();
  const mainProject = await getMainProjectSafe(tenantId);

  const nextMeeting = await prisma.customProjectMeetingBooking.findFirst({
    where: { tenantId, scheduledStart: { gte: now }, status: "SCHEDULED" },
    orderBy: { scheduledStart: "asc" },
    include: { customMeeting: { select: { meetingUrl: true } } },
  });

  const [pendingPayments, openTickets, waitingTickets, pendingBudgets, recentLogs] = await Promise.all([
    prisma.clientPayment.findMany({
      where: {
        tenantId,
        paidAt: null,
      },
      orderBy: { dueAt: "asc" },
      take: 5,
      select: { id: true, concept: true, totalAmount: true, paidAmount: true, dueAt: true },
    }),
    prisma.supportTicket.count({
      where: { tenantId, status: { in: ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"] } },
    }),
    prisma.supportTicket.count({
      where: { tenantId, status: "WAITING_INTERNAL" },
    }),
    prisma.customQuote.count({
      where: { tenantId, status: "PENDING_CLIENT" },
    }),
    prisma.auditLog.findMany({
      where: {
        tenantId,
        action: {
          in: [
            "platform.custom_project_provisioned",
            "platform.custom_project_rollback",
            "business.custom_quote_accepted",
            "business.custom_quote_rejected",
            "platform.custom_request_pipeline_moved",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, createdAt: true, metadata: true },
    }),
  ]);

  const timeline = [
    ...(mainProject?.updates.map((update) => ({
      id: update.id,
      at: update.createdAt,
      title: update.title,
      detail: update.body ?? null,
      source: "project_update" as const,
    })) ?? []),
    ...recentLogs.map((event) => ({
      id: event.id,
      at: event.createdAt,
      title: event.action,
      detail: null,
      source: "audit" as const,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);

  return {
    project: mainProject
      ? {
          id: mainProject.id,
          name: mainProject.name,
          status: mainProject.status,
          progressPercent: mainProject.progressPercent,
          lastUpdatedAt: mainProject.updatedAt,
          lastUpdate: mainProject.updates[0] ?? null,
        }
      : null,
    nextMeeting: nextMeeting
      ? {
          startsAt: nextMeeting.scheduledStart,
          endsAt: nextMeeting.scheduledEnd,
          meetUrl: nextMeeting.meetingUrl ?? nextMeeting.customMeeting?.meetingUrl ?? null,
        }
      : null,
    payments: {
      pendingCount: pendingPayments.length,
      nextDueAt: pendingPayments.find((item) => item.dueAt)?.dueAt ?? null,
      items: pendingPayments,
    },
    tickets: {
      openCount: openTickets,
      waitingResponseCount: waitingTickets,
    },
    budgets: {
      pendingApprovalCount: pendingBudgets,
    },
    timeline,
  };
}

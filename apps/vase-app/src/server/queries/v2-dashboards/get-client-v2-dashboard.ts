// Parte de v2-dashboards.ts: getClientV2Dashboard.
import { prisma } from "@/lib/db/prisma";
import { getMainProjectSafe } from "./get-main-project-safe";

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

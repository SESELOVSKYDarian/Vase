import { prisma } from "@/lib/db/prisma";

const ACTIVE_TICKET_STATUSES = ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"] as const;

export async function autoAssignSupportTicket(ticketId: string, tenantId: string) {
  const policy = await prisma.supportQueuePolicy.findFirst({
    where: {
      OR: [{ tenantId }, { tenantId: null }],
    },
    orderBy: [{ tenantId: "desc" }, { updatedAt: "desc" }],
  });

  const maxActive = policy?.maxActiveTicketsPerUser ?? 5;
  const internalSupport = await prisma.internalUserProfile.findMany({
    where: {
      type: "SUPPORT",
      accountState: "ACTIVE",
      availability: "ONLINE",
      user: {
        platformRole: "SUPPORT",
        isDisabled: false,
      },
    },
    select: {
      userId: true,
    },
  });

  if (internalSupport.length === 0) {
    return { assigned: false as const };
  }

  const candidates = await Promise.all(
    internalSupport.map(async (profile) => {
      const [activeCount, todayCount] = await Promise.all([
        prisma.supportTicket.count({
          where: {
            assignedToUserId: profile.userId,
            status: { in: [...ACTIVE_TICKET_STATUSES] },
          },
        }),
        prisma.supportTicket.count({
          where: {
            assignedToUserId: profile.userId,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

      return {
        userId: profile.userId,
        activeCount,
        todayCount,
      };
    }),
  );

  const available = candidates.filter((candidate) => candidate.activeCount < maxActive);
  if (available.length === 0) return { assigned: false as const };

  available.sort((a, b) => {
    if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
    if (a.todayCount !== b.todayCount) return a.todayCount - b.todayCount;
    return a.userId.localeCompare(b.userId);
  });

  const selected = available[0];
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      assignedToUserId: selected.userId,
      status: "ASSIGNED",
      assignmentMode: "AUTOMATIC",
      firstAssignedAt: new Date(),
    },
  });

  if ((policy?.autoBusyEnabled ?? true) && selected.activeCount + 1 >= maxActive) {
    await prisma.internalUserProfile.update({
      where: { userId: selected.userId },
      data: {
        availability: "BUSY",
      },
    });
  }

  return {
    assigned: true as const,
    assignedUserId: selected.userId,
  };
}

import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminMeetingsWorkspace } from "@/components/admin/admin-meetings-workspace";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

type MeetingV2Row = {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  meetUrl: string | null;
  scheduledAt: Date | null;
  description: string | null;
  createdAt: Date;
};

type MeetingTaskV2Row = {
  id: string;
  meetingId: string;
  title: string;
  completed: boolean;
  dueDate: Date | null;
  responsibleUserId: string | null;
};

type MeetingDecisionV2Row = {
  id: string;
  meetingId: string;
  description: string;
  createdAt: Date;
};

export default async function AdminMeetingsPage() {
  try {
    await requireAdminPermission(adminPermissions.USERS);
  } catch {
    forbidden();
  }

  const prismaMeetings = prisma as unknown as {
    meetingV2: { findMany: (args: { orderBy: { scheduledAt: "desc" }; take: number }) => Promise<MeetingV2Row[]> };
    meetingTaskV2: { findMany: (args: { where: { meetingId: { in: string[] } } }) => Promise<MeetingTaskV2Row[]> };
    meetingDecisionV2: { findMany: (args: { where: { meetingId: { in: string[] } }; orderBy: { createdAt: "desc" } }) => Promise<MeetingDecisionV2Row[]> };
  };

  const [tenants, agents, meetingsRaw] = await Promise.all([
    prisma.tenant.findMany({
      select: { id: true, accountName: true },
      orderBy: { accountName: "asc" },
      take: 300,
    }),
    prisma.user.findMany({
      where: { platformRole: { in: ["SUPER_ADMIN", "SUPPORT", "DEVELOPER"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 300,
    }),
    prismaMeetings.meetingV2.findMany({
      orderBy: { scheduledAt: "desc" },
      take: 400,
    }),
  ]);

  const ids = meetingsRaw.map((meeting) => meeting.id);
  const [tasks, decisions] = ids.length
    ? await Promise.all([
        prismaMeetings.meetingTaskV2.findMany({ where: { meetingId: { in: ids } } }),
        prismaMeetings.meetingDecisionV2.findMany({ where: { meetingId: { in: ids } }, orderBy: { createdAt: "desc" } }),
      ])
    : [[], []];

  const usersById = new Map(agents.map((agent) => [agent.id, agent.name]));
  const tasksByMeetingId = tasks.reduce<Record<string, MeetingTaskV2Row[]>>((acc, task) => {
    if (!acc[task.meetingId]) acc[task.meetingId] = [];
    acc[task.meetingId].push(task);
    return acc;
  }, {});
  const decisionsByMeetingId = decisions.reduce<Record<string, MeetingDecisionV2Row[]>>((acc, decision) => {
    if (!acc[decision.meetingId]) acc[decision.meetingId] = [];
    acc[decision.meetingId].push(decision);
    return acc;
  }, {});

  const meetings = meetingsRaw.map((meeting) => ({
    id: meeting.id,
    tenantId: meeting.tenantId,
    title: meeting.title,
    category: meeting.category,
    meetUrl: meeting.meetUrl,
    scheduledAt: meeting.scheduledAt?.toISOString() ?? null,
    description: meeting.description,
    createdAt: meeting.createdAt.toISOString(),
    tenantLabel: tenants.find((tenant) => tenant.id === meeting.tenantId)?.accountName ?? "Sin cliente",
    tasks: (tasksByMeetingId[meeting.id] ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      dueDate: task.dueDate?.toISOString() ?? null,
      responsibleUserLabel: task.responsibleUserId ? (usersById.get(task.responsibleUserId) ?? null) : null,
    })),
    decisions: (decisionsByMeetingId[meeting.id] ?? []).map((decision) => ({
      id: decision.id,
      description: decision.description,
      createdAt: decision.createdAt.toISOString(),
    })),
  }));

  return (
    <AppShell title="Reuniones" subtitle="Agenda operativa con decisiones y tareas por reunión." tenantLabel="Admin Master">
      <AdminMeetingsWorkspace tenants={tenants} agents={agents} meetings={meetings} />
    </AppShell>
  );
}

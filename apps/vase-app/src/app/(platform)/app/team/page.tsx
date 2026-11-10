import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TeamBoard, type TeamEntry } from "@/components/panel/team-board";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { canAddTeamMember, effectiveModuleIds, teamLimitText, teamSeatsUsed } from "@/lib/team/team-access";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";
}

export default async function TeamPage() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, members, invitations, subscription] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    prisma.membership.findMany({
      where: { tenantId: membership.tenantId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        status: true,
        user: { select: { name: true, email: true, avatarUrl: true, moduleAccesses: { select: { moduleId: true, isActive: true } } } },
      },
    }),
    prisma.tenantInvitation.findMany({
      where: { tenantId: membership.tenantId, status: "PENDING", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, moduleIds: true },
    }),
    prisma.tenantSubscription.findUnique({ where: { tenantId: membership.tenantId }, select: { teamMemberLimit: true } }),
  ]);
  if (!dashboard) forbidden();

  const teamLimit = subscription?.teamMemberLimit ?? 3;
  const used = teamSeatsUsed({
    teamMembers: members.filter((member) => member.role !== "OWNER").length,
    pendingInvitations: invitations.length,
  });
  const contracted = dashboard.modules.filter((module) => module.isActive);
  const contractedIds = contracted.map((module) => module.id as string);

  const entries: TeamEntry[] = [
    ...members.map((member) => ({
      kind: "member" as const,
      id: member.id,
      initials: initialsOf(member.user.name),
      avatarUrl: member.user.avatarUrl,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      moduleIds: effectiveModuleIds(member.user.moduleAccesses, contractedIds),
      pending: false,
    })),
    ...invitations.map((invitation) => ({
      kind: "invite" as const,
      id: invitation.id,
      initials: initialsOf(invitation.email),
      avatarUrl: null,
      name: invitation.email,
      email: "Invitación enviada",
      role: invitation.role,
      moduleIds: Array.isArray(invitation.moduleIds)
        ? invitation.moduleIds.filter((id): id is string => typeof id === "string" && contractedIds.includes(id))
        : [],
      pending: true,
    })),
  ];

  return (
    <AppShell
      title="Equipo"
      subtitle="Las personas que usan tu cuenta"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
    >
      <TeamBoard
        entries={entries}
        contracted={contracted.map((module) => ({ id: module.id, key: module.key }))}
        limitText={teamLimitText(used, teamLimit)}
        canInvite={canAddTeamMember(used, teamLimit)}
      />
    </AppShell>
  );
}

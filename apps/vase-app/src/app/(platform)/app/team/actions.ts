"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { isTeamRole, sanitizeModuleSelection, type TeamRole } from "@/lib/team/team-access";
import { createAuditLog } from "@/server/services/audit-log";
import { getTenantModulesAccess } from "@/server/queries/modules";
import { applyUserModuleAccess, createTeamInvitation } from "@/server/services/team-invitations";

export type TeamActionState = { success?: string; error?: string };

const emailSchema = z.email().trim().toLowerCase().max(191);

async function requireTeamOwner() {
  const { session, membership } = await requireTenantRole(tenantRoles.OWNER);
  const access = await getTenantModulesAccess(membership.tenantId, session.user.id);
  const contractedIds = (access?.modules ?? []).filter((module) => module.isActive).map((module) => module.id as string);
  return { session, membership, contractedIds };
}

function audit(action: string, targetType: string, targetId: string, tenantId: string, actorUserId: string) {
  return createAuditLog({ action, targetType, targetId, tenantId, actorUserId });
}

export async function inviteTeamMemberAction(_: TeamActionState, formData: FormData): Promise<TeamActionState> {
  try {
    const { session, membership, contractedIds } = await requireTeamOwner();
    const email = emailSchema.safeParse(formData.get("email"));
    const role = formData.get("role");
    if (!email.success) return { error: "Revisá el correo." };
    if (!isTeamRole(role)) return { error: "Elegí un rol." };

    const moduleIds = sanitizeModuleSelection(role, formData.getAll("moduleIds"), contractedIds);
    if (moduleIds.length === 0) return { error: "Elegí al menos un producto." };

    await enforceRateLimit({
      scope: "team:invite",
      key: membership.tenantId,
      limit: 20,
      windowSeconds: 60 * 60,
    });

    const alreadyMember = await prisma.membership.findFirst({
      where: { tenantId: membership.tenantId, user: { email: email.data } },
      select: { id: true },
    });
    if (alreadyMember) return { error: "Esa persona ya está en tu equipo." };

    const invitation = await createTeamInvitation({
      tenantId: membership.tenantId,
      tenantName: membership.tenant.name,
      invitedByUserId: session.user.id,
      email: email.data,
      role,
      moduleIds,
    });
    await audit("team.invitation_created", "TenantInvitation", invitation.id, membership.tenantId, session.user.id);
    revalidatePath("/app/team");
    return { success: "Invitación enviada." };
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return { error: "Enviaste muchas invitaciones. Probá en un rato." };
    }
    return { error: "No pudimos enviar la invitación." };
  }
}

export async function revokeInvitationAction(invitationId: string): Promise<TeamActionState> {
  try {
    const { session, membership } = await requireTeamOwner();
    const result = await prisma.tenantInvitation.updateMany({
      where: { id: invitationId, tenantId: membership.tenantId, status: "PENDING" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    if (result.count === 1) {
      await audit("team.invitation_revoked", "TenantInvitation", invitationId, membership.tenantId, session.user.id);
    }
    revalidatePath("/app/team");
    return {};
  } catch {
    return { error: "No pudimos cancelar la invitación." };
  }
}

export async function updateInvitationAction(input: {
  invitationId: string;
  role: TeamRole;
  moduleIds: string[];
}): Promise<TeamActionState> {
  try {
    const { session, membership, contractedIds } = await requireTeamOwner();
    if (!isTeamRole(input.role)) return { error: "Elegí un rol." };
    const moduleIds = sanitizeModuleSelection(input.role, input.moduleIds, contractedIds);
    const result = await prisma.tenantInvitation.updateMany({
      where: { id: input.invitationId, tenantId: membership.tenantId, status: "PENDING" },
      data: { role: input.role, moduleIds },
    });
    if (result.count === 1) {
      await audit("team.invitation_updated", "TenantInvitation", input.invitationId, membership.tenantId, session.user.id);
    }
    revalidatePath("/app/team");
    return {};
  } catch {
    return { error: "No pudimos guardar el cambio." };
  }
}

async function findEditableMember(membershipId: string, tenantId: string) {
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId, role: { in: ["MANAGER", "MEMBER"] } },
    select: { id: true, userId: true },
  });
  return target;
}

export async function updateMemberAction(input: {
  membershipId: string;
  role: TeamRole;
  moduleIds: string[];
}): Promise<TeamActionState> {
  try {
    const { session, membership, contractedIds } = await requireTeamOwner();
    if (!isTeamRole(input.role)) return { error: "Elegí un rol." };
    const target = await findEditableMember(input.membershipId, membership.tenantId);
    if (!target) return { error: "No encontramos a esa persona." };

    const moduleIds = sanitizeModuleSelection(input.role, input.moduleIds, contractedIds);
    await prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id: target.id }, data: { role: input.role } });
      await applyUserModuleAccess(tx, target.userId, moduleIds);
    });
    await audit("team.member_updated", "Membership", target.id, membership.tenantId, session.user.id);
    revalidatePath("/app/team");
    return {};
  } catch {
    return { error: "No pudimos guardar el cambio." };
  }
}

export async function removeMemberAction(membershipId: string): Promise<TeamActionState> {
  try {
    const { session, membership } = await requireTeamOwner();
    const target = await findEditableMember(membershipId, membership.tenantId);
    if (!target) return { error: "No encontramos a esa persona." };

    await prisma.$transaction(async (tx) => {
      await tx.membership.delete({ where: { id: target.id } });
      const remaining = await tx.membership.count({ where: { userId: target.userId } });
      if (remaining === 0) {
        await tx.userModuleAccess.deleteMany({ where: { userId: target.userId } });
      }
    });
    await audit("team.member_removed", "Membership", target.id, membership.tenantId, session.user.id);
    revalidatePath("/app/team");
    return {};
  } catch {
    return { error: "No pudimos quitar a esa persona." };
  }
}

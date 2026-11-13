import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getManagedUserAccessModuleIds } from "@/lib/admin/user-access";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { isTeamRole, sanitizeModuleSelection } from "@/lib/team/team-access";
import { sendAuthEmail } from "@/server/services/auth-email";

const INVITATION_DAYS = 7;

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function invitationUrl(token: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar";
  return new URL(`/invite?token=${token}`, origin).toString();
}

function invitationExpiry() {
  return new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000);
}

export async function createTeamInvitation(input: {
  tenantId: string;
  tenantName: string;
  invitedByUserId: string;
  email: string;
  role: "MANAGER" | "MEMBER";
  moduleIds: string[];
}) {
  const token = randomBytes(32).toString("hex");
  const invitation = await prisma.$transaction(async (tx) => {
    await tx.tenantInvitation.updateMany({
      where: { tenantId: input.tenantId, email: input.email, status: "PENDING" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    return tx.tenantInvitation.create({
      data: {
        tenantId: input.tenantId,
        invitedByUserId: input.invitedByUserId,
        name: input.email.split("@")[0],
        email: input.email,
        role: input.role,
        moduleIds: input.moduleIds,
        tokenHash: hashInvitationToken(token),
        expiresAt: invitationExpiry(),
      },
    });
  });

  await sendAuthEmail({
    email: input.email,
    subject: `Te invitaron al equipo de ${input.tenantName} en Vase`,
    actionUrl: invitationUrl(token),
  });

  return invitation;
}

export async function findValidInvitation(token: string) {
  if (!token) return null;
  const invitation = await prisma.tenantInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    include: { tenant: { select: { name: true, status: true } } },
  });
  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) return null;
  if (invitation.tenant.status === "SUSPENDED") return null;
  return invitation;
}

export async function applyUserModuleAccess(
  tx: Prisma.TransactionClient,
  userId: string,
  selectedModuleIds: readonly string[],
) {
  for (const moduleId of getManagedUserAccessModuleIds()) {
    const isActive = selectedModuleIds.includes(moduleId);
    await tx.userModuleAccess.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: { isActive },
      create: { userId, moduleId, isActive },
    });
  }
}

type ValidInvitation = NonNullable<Awaited<ReturnType<typeof findValidInvitation>>>;

/** Pasa la invitación a aceptada una sola vez: si ya se usó, falla y no crea nada. */
async function claimInvitation(tx: Prisma.TransactionClient, invitation: ValidInvitation) {
  const claimed = await tx.tenantInvitation.updateMany({
    where: { id: invitation.id, status: "PENDING", expiresAt: { gt: new Date() } },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });
  if (claimed.count !== 1) throw new Error("INVITATION_INVALID");
}

async function joinTenant(tx: Prisma.TransactionClient, invitation: ValidInvitation, userId: string) {
  if (!isTeamRole(invitation.role)) throw new Error("INVITATION_INVALID");
  const [teamMembers, subscription] = await Promise.all([
    tx.membership.count({ where: { tenantId: invitation.tenantId, role: { not: "OWNER" } } }),
    tx.tenantSubscription.findUnique({ where: { tenantId: invitation.tenantId }, select: { teamMemberLimit: true } }),
  ]);
  if (teamMembers >= (subscription?.teamMemberLimit ?? 3)) throw new Error("TEAM_FULL");
  const contracted = Array.isArray(invitation.moduleIds) ? (invitation.moduleIds as unknown[]) : [];
  const allowed = contracted.filter((id): id is string => typeof id === "string");
  await tx.membership.create({
    data: {
      userId,
      tenantId: invitation.tenantId,
      createdByUserId: invitation.invitedByUserId,
      role: invitation.role,
      status: "ACTIVE",
    },
  });
  await applyUserModuleAccess(tx, userId, sanitizeModuleSelection(invitation.role, allowed, allowed));
}

export async function acceptInvitationAsNewUser(invitation: ValidInvitation, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (existing) throw new Error("EMAIL_ALREADY_IN_USE");
  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await claimInvitation(tx, invitation);
    const user = await tx.user.create({
      data: {
        name,
        email: invitation.email,
        passwordHash,
        locale: "es",
        platformRole: "USER",
        // Abrir el enlace del correo ya prueba que la casilla es suya.
        emailVerified: new Date(),
      },
    });
    await joinTenant(tx, invitation, user.id);
  });
}

export async function acceptInvitationAsExistingUser(invitation: ValidInvitation, userId: string) {
  const memberships = await prisma.membership.count({ where: { userId } });
  if (memberships > 0) throw new Error("USER_ALREADY_IN_TENANT");

  await prisma.$transaction(async (tx) => {
    await claimInvitation(tx, invitation);
    await joinTenant(tx, invitation, userId);
  });
}

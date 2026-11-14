"use server";

// Disponibilidad, estado y cambio de clave de un usuario.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { resetUserPasswordSchema, updateInternalAvailabilitySchema, updateUserStatusSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState, generateTemporaryPassword } from "./shared";

export async function updateInternalAvailabilityByAdminAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateInternalAvailabilitySchema.safeParse({
      userId: formData.get("userId"),
      availability: formData.get("availability"),
    });
    if (!parsed.success) return { error: "Estado de disponibilidad invalido." };

    const current = await prisma.internalUserProfile.findUnique({
      where: { userId: parsed.data.userId },
      select: { availability: true },
    });
    if (!current) return { error: "Perfil interno no encontrado." };

    await prisma.$transaction(async (tx) => {
      await tx.internalUserProfile.update({
        where: { userId: parsed.data.userId },
        data: { availability: parsed.data.availability },
      });
      await tx.availabilityLog.create({
        data: {
          userId: parsed.data.userId,
          actorUserId: adminSession.user.id,
          previousStatus: current.availability,
          nextStatus: parsed.data.availability,
          changedBy: "ADMIN",
        },
      });
    });

    await createAuditLog({
      action: "platform.internal_availability_updated",
      targetType: "internal_user_profile",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
      metadata: {
        before: current.availability,
        after: parsed.data.availability,
      },
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/support");
    return { success: "Disponibilidad actualizada." };
  } catch {
    return { error: "No pudimos actualizar disponibilidad." };
  }
}

export async function updateUserStatusAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.USERS);
    const parsed = updateUserStatusSchema.safeParse({
      userId: formData.get("userId"),
      isDisabled: formData.get("isDisabled") === "true",
      disabledReason: sanitizeNullableText(String(formData.get("disabledReason") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "No pudimos validar el estado del usuario." };

    const previousUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { isDisabled: true, disabledReason: true, disabledAt: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parsed.data.userId },
        data: {
          isDisabled: parsed.data.isDisabled,
          disabledAt: parsed.data.isDisabled ? new Date() : null,
          disabledReason: parsed.data.isDisabled ? parsed.data.disabledReason ?? "Desactivado por administrador." : null,
        },
      });
      if (parsed.data.isDisabled) {
        await tx.session.deleteMany({ where: { userId: parsed.data.userId } });
      }
    });

    await createAuditLog({
      action: parsed.data.isDisabled ? "platform.user_disabled" : "platform.user_reenabled",
      targetType: "user",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
      metadata: {
        before: previousUser,
        after: {
          isDisabled: parsed.data.isDisabled,
          disabledReason: parsed.data.isDisabled ? parsed.data.disabledReason ?? "Desactivado por administrador." : null,
        },
      },
    });
    revalidatePath("/app/admin");
    revalidatePath("/app/admin/users");
    return { success: parsed.data.isDisabled ? "Usuario desactivado." : "Usuario reactivado." };
  } catch {
    return { error: "No pudimos actualizar el estado del usuario." };
  }
}

export type AdminPasswordResetActionState = AdminGovernanceActionState & {
  generatedPassword?: string;
};

export async function resetUserPasswordByAdminAction(
  _: AdminPasswordResetActionState,
  formData: FormData,
): Promise<AdminPasswordResetActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.USERS);
    const parsed = resetUserPasswordSchema.safeParse({
      userId: formData.get("userId"),
    });
    if (!parsed.success) return { error: "Usuario invalido para reset." };
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parsed.data.userId },
        data: {
          passwordHash,
          forcePasswordChange: true,
          tempPasswordIssuedAt: new Date(),
          passwordChangedAt: new Date(),
        },
      });
      await tx.session.deleteMany({ where: { userId: parsed.data.userId } });
    });

    await createAuditLog({
      action: "platform.user_password_reset_by_admin",
      targetType: "user",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin");
    return {
      success: "Contrasena temporal generada. Copiala ahora.",
      generatedPassword: tempPassword,
    };
  } catch {
    return { error: "No pudimos resetear la contrasena." };
  }
}

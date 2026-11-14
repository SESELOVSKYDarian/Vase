"use server";

// Política de acceso al admin.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { updateAdminAccessPolicySchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "./shared";

export async function updateAdminAccessPolicyAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = updateAdminAccessPolicySchema.safeParse({
      userId: formData.get("userId"),
      canManageUsers: formData.get("canManageUsers") === "on",
      canManageModules: formData.get("canManageModules") === "on",
      canManageBilling: formData.get("canManageBilling") === "on",
      canManageFaqs: formData.get("canManageFaqs") === "on",
      canManageWiki: formData.get("canManageWiki") === "on",
      canViewAudit: formData.get("canViewAudit") === "on",
      canManageNotifications: formData.get("canManageNotifications") === "on",
    });
    if (!parsed.success) return { error: "Politica invalida." };

    const previousPolicy = await prisma.adminAccessPolicy.findUnique({
      where: { userId: parsed.data.userId },
    });

    const savedPolicy = await prisma.adminAccessPolicy.upsert({
      where: { userId: parsed.data.userId },
      update: {
        canManageUsers: parsed.data.canManageUsers,
        canManageModules: parsed.data.canManageModules,
        canManageBilling: parsed.data.canManageBilling,
        canManageFaqs: parsed.data.canManageFaqs,
        canManageWiki: parsed.data.canManageWiki,
        canViewAudit: parsed.data.canViewAudit,
        canManageNotifications: parsed.data.canManageNotifications,
      },
      create: {
        userId: parsed.data.userId,
        canManageUsers: parsed.data.canManageUsers,
        canManageModules: parsed.data.canManageModules,
        canManageBilling: parsed.data.canManageBilling,
        canManageFaqs: parsed.data.canManageFaqs,
        canManageWiki: parsed.data.canManageWiki,
        canViewAudit: parsed.data.canViewAudit,
        canManageNotifications: parsed.data.canManageNotifications,
      },
    });

    await createAuditLog({
      action: "platform.admin_access_policy_updated",
      targetType: "admin_access_policy",
      targetId: savedPolicy.id,
      actorUserId: adminSession.user.id,
      metadata: {
        before: previousPolicy,
        after: savedPolicy,
      },
    });
    revalidatePath("/app/admin");
    return { success: "Permisos admin actualizados." };
  } catch {
    return { error: "No pudimos guardar los permisos admin." };
  }
}

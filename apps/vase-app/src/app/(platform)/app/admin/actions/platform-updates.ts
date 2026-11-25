"use server";

// Novedades de la plataforma.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { deletePlatformUpdateSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "./shared";

export async function deletePlatformUpdateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = deletePlatformUpdateSchema.safeParse({
      updateId: formData.get("updateId"),
    });

    if (!parsed.success) {
      return { error: "ID de anuncio invÃ¡lido." };
    }

    await prisma.platformUpdate.delete({
      where: { id: parsed.data.updateId },
    });

    await createAuditLog({
      action: "platform.update_deleted",
      targetType: "platform_update",
      targetId: parsed.data.updateId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin");
    revalidatePath("/app");
    return { success: "Anuncio de plataforma eliminado." };
  } catch {
    return { error: "No pudimos eliminar el anuncio." };
  }
}

"use server";

// Novedades de la plataforma.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createPlatformUpdateSchema, deletePlatformUpdateSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "./shared";

export async function createPlatformUpdateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createPlatformUpdateSchema.safeParse({
      title: sanitizeText(String(formData.get("title") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      href: sanitizeNullableText(String(formData.get("href") ?? "")) ?? undefined,
      tone: formData.get("tone"),
      category: formData.get("category"),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa tÃ­tulo, descripciÃ³n, categorÃ­a y tono del anuncio." };
    }

    const update = await prisma.platformUpdate.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        href: parsed.data.href,
        tone: parsed.data.tone,
        category: parsed.data.category,
        isActive: parsed.data.isActive,
        publishedAt: new Date(),
      },
    });

    await createAuditLog({
      action: "platform.update_created",
      targetType: "platform_update",
      targetId: update.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        title: update.title,
        category: update.category,
      },
    });

    revalidatePath("/app/admin");
    revalidatePath("/app");
    return { success: "Anuncio de plataforma creado." };
  } catch {
    return { error: "No pudimos crear el anuncio." };
  }
}

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


export async function deletePlatformUpdateFormAction(formData: FormData): Promise<void> {
  await deletePlatformUpdateAction({}, formData);
}

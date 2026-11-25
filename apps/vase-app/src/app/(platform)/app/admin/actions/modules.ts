"use server";

// Módulos de la plataforma: crear, editar, borrar y poner precio.
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import { createAdminModuleSchema, deleteAdminModuleSchema, updateAdminModuleSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { AdminGovernanceActionState } from "./shared";

export async function createAdminModuleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = createAdminModuleSchema.safeParse({
      id: sanitizeText(String(formData.get("id") ?? "")),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      product: formData.get("product"),
      route: sanitizeText(String(formData.get("route") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa id, nombre, descripcion, producto y ruta del modulo." };
    }

    await ensureModuleCatalogSynced();

    const createdModule = await prisma.module.create({
      data: {
        id: parsed.data.id,
        name: parsed.data.name,
        description: parsed.data.description,
        product: parsed.data.product,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.module_created",
      targetType: "module",
      targetId: createdModule.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        product: createdModule.product,
        route: createdModule.route,
      },
    });

    revalidatePath("/app/admin/modules");
    revalidatePath("/app/admin");
    return { success: "Modulo creado correctamente." };
  } catch {
    return { error: "No pudimos crear el modulo." };
  }
}

export async function updateAdminModuleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = updateAdminModuleSchema.safeParse({
      moduleId: formData.get("moduleId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      route: sanitizeText(String(formData.get("route") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, descripcion, ruta y estado del modulo." };
    }

    const updatedModule = await prisma.module.update({
      where: { id: parsed.data.moduleId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.module_updated",
      targetType: "module",
      targetId: updatedModule.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        isActive: updatedModule.isActive,
        route: updatedModule.route,
      },
    });

    revalidatePath("/app/admin/modules");
    revalidatePath("/app/admin");
    return { success: "Modulo actualizado." };
  } catch {
    return { error: "No pudimos actualizar el modulo." };
  }
}

export async function deleteAdminModuleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = deleteAdminModuleSchema.safeParse({
      moduleId: formData.get("moduleId"),
    });
    if (!parsed.success) {
      return { error: "Modulo invalido." };
    }

    const existing = await prisma.module.findUnique({
      where: { id: parsed.data.moduleId },
      select: { id: true, name: true },
    });
    if (!existing) {
      return { error: "El modulo ya no existe." };
    }

    await prisma.module.delete({
      where: { id: parsed.data.moduleId },
    });

    await createAuditLog({
      action: "platform.module_deleted",
      targetType: "module",
      targetId: existing.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { name: existing.name },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Modulo eliminado definitivamente." };
  } catch {
    return { error: "No pudimos eliminar el modulo." };
  }
}

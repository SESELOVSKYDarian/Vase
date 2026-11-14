"use server";

// Submódulos y sus precios.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import { createModuleSubmoduleSchema, deleteModuleSubmoduleSchema, updateModuleSubmodulePricingSchema, updateModuleSubmoduleSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { normalizePricingType } from "@/server/services/modules";
import { AdminGovernanceActionState } from "./shared";

export async function createModuleSubmoduleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = createModuleSubmoduleSchema.safeParse({
      moduleId: formData.get("moduleId"),
      key: sanitizeText(String(formData.get("key") ?? "")),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      route: sanitizeText(String(formData.get("route") ?? "")),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return { error: "Revisa los campos del submodulo." };
    }

    const created = await prisma.moduleSubmodule.create({
      data: {
        moduleId: parsed.data.moduleId,
        key: parsed.data.key,
        name: parsed.data.name,
        description: parsed.data.description,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.module_submodule_created",
      targetType: "module_submodule",
      targetId: created.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { moduleId: created.moduleId, key: created.key, route: created.route },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Submodulo creado." };
  } catch {
    return { error: "No pudimos crear el submodulo." };
  }
}

export async function updateModuleSubmoduleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = updateModuleSubmoduleSchema.safeParse({
      submoduleId: formData.get("submoduleId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      route: sanitizeText(String(formData.get("route") ?? "")),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return { error: "Revisa los datos del submodulo." };
    }

    const updated = await prisma.moduleSubmodule.update({
      where: { id: parsed.data.submoduleId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.module_submodule_updated",
      targetType: "module_submodule",
      targetId: updated.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { route: updated.route, isActive: updated.isActive },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Submodulo actualizado." };
  } catch {
    return { error: "No pudimos actualizar el submodulo." };
  }
}

export async function deleteModuleSubmoduleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = deleteModuleSubmoduleSchema.safeParse({
      submoduleId: formData.get("submoduleId"),
    });
    if (!parsed.success) {
      return { error: "Submodulo invalido." };
    }

    const existing = await prisma.moduleSubmodule.findUnique({
      where: { id: parsed.data.submoduleId },
      select: { id: true, name: true, moduleId: true },
    });
    if (!existing) {
      return { error: "El submodulo ya no existe." };
    }

    await prisma.moduleSubmodule.delete({
      where: { id: parsed.data.submoduleId },
    });

    await createAuditLog({
      action: "platform.module_submodule_deleted",
      targetType: "module_submodule",
      targetId: existing.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { name: existing.name, moduleId: existing.moduleId },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Submodulo eliminado definitivamente." };
  } catch {
    return { error: "No pudimos eliminar el submodulo." };
  }
}


export async function updateModuleSubmodulePricingAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateModuleSubmodulePricingSchema.safeParse({
      submoduleId: formData.get("submoduleId"),
      price: formData.get("price"),
      currency: sanitizeText(String(formData.get("currency") ?? "")),
      type: formData.get("type"),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return { error: "Revisa precio, moneda y tipo del submodulo." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.moduleSubmodulePricing.updateMany({
        where: { submoduleId: parsed.data.submoduleId, isActive: true },
        data: { isActive: false },
      });
      await tx.moduleSubmodulePricing.create({
        data: {
          submoduleId: parsed.data.submoduleId,
          price: parsed.data.price,
          currency: parsed.data.currency,
          type: normalizePricingType(parsed.data.type),
          isActive: parsed.data.isActive,
        },
      });
    });

    await createAuditLog({
      action: "platform.module_submodule_pricing_updated",
      targetType: "module_submodule_pricing",
      targetId: parsed.data.submoduleId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { price: parsed.data.price, currency: parsed.data.currency, type: parsed.data.type },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Pricing del submodulo actualizado." };
  } catch {
    return { error: "No pudimos actualizar el pricing del submodulo." };
  }
}

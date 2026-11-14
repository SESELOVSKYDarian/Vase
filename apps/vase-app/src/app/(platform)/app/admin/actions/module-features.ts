"use server";

// Funciones de cada módulo.
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createModuleFeatureSchema, deleteModuleFeatureSchema, updateModuleFeatureSchema } from "@/lib/validators/admin";
import { emitAuditLogEvent, persistAuditLog } from "@/server/services/audit-log";
import { getBusinessFeatureScope, parseModuleFeatureDefault } from "@/server/services/module-features";
import { AdminGovernanceActionState, mapModuleFeatureActionError, parseNullableInteger, toModuleFeatureJsonValue } from "./shared";

export async function createModuleFeatureAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);
    const valueType = formData.get("valueType");
    const parsed = createModuleFeatureSchema.safeParse({
      moduleId: formData.get("moduleId"),
      submoduleId: String(formData.get("submoduleId") ?? "").trim() || null,
      key: String(formData.get("key") ?? ""),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeNullableText(String(formData.get("description") ?? "")) ?? null,
      valueType,
      trialDefault: parseModuleFeatureDefault(formData, "trialDefault", valueType),
      activeDefault: parseModuleFeatureDefault(formData, "activeDefault", valueType),
      minValue: parseNullableInteger(formData, "minValue"),
      maxValue: parseNullableInteger(formData, "maxValue"),
      sortOrder: formData.get("sortOrder"),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return { error: "Revisa los valores y límites de la característica." };

    const result = await prisma.$transaction(async (tx) => {
      const scope = await getBusinessFeatureScope(tx, parsed.data);
      const created = await tx.moduleFeature.create({
        data: {
          // scopeKey is deliberately omitted: it is migration-only and is not
          // represented by the Prisma ModuleFeature public contract.
          moduleId: scope.moduleId,
          submoduleId: scope.submoduleId,
          key: parsed.data.key,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          valueType: parsed.data.valueType,
          trialDefault: toModuleFeatureJsonValue(parsed.data.trialDefault),
          activeDefault: toModuleFeatureJsonValue(parsed.data.activeDefault),
          minValue: parsed.data.minValue,
          maxValue: parsed.data.maxValue,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });
      const auditPayload = {
        action: "platform.module_feature_created",
        targetType: "module_feature",
        targetId: created.id,
        actorUserId: adminSession.user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { moduleId: created.moduleId, submoduleId: created.submoduleId, key: created.key },
      };
      await persistAuditLog(tx, auditPayload);
      return { auditPayload };
    });
    emitAuditLogEvent(result.auditPayload);
    revalidatePath("/app/admin/modules");
    revalidatePath("/modules");
    return { success: "Característica creada." };
  } catch (error) {
    return { error: mapModuleFeatureActionError(error, "No pudimos crear la característica.") };
  }
}

export async function updateModuleFeatureAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);
    const valueType = formData.get("valueType");
    const parsed = updateModuleFeatureSchema.safeParse({
      featureId: formData.get("featureId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeNullableText(String(formData.get("description") ?? "")) ?? null,
      valueType,
      trialDefault: parseModuleFeatureDefault(formData, "trialDefault", valueType),
      activeDefault: parseModuleFeatureDefault(formData, "activeDefault", valueType),
      minValue: parseNullableInteger(formData, "minValue"),
      maxValue: parseNullableInteger(formData, "maxValue"),
      sortOrder: formData.get("sortOrder"),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return { error: "Revisa los valores y límites de la característica." };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.moduleFeature.findUnique({
        where: { id: parsed.data.featureId },
        select: { id: true, moduleId: true, submoduleId: true, key: true },
      });
      if (!existing) throw new Error("MODULE_FEATURE_NOT_FOUND");
      await getBusinessFeatureScope(tx, existing);
      const updated = await tx.moduleFeature.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          valueType: parsed.data.valueType,
          trialDefault: toModuleFeatureJsonValue(parsed.data.trialDefault),
          activeDefault: toModuleFeatureJsonValue(parsed.data.activeDefault),
          minValue: parsed.data.minValue,
          maxValue: parsed.data.maxValue,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });
      const auditPayload = {
        action: "platform.module_feature_updated",
        targetType: "module_feature",
        targetId: updated.id,
        actorUserId: adminSession.user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { moduleId: updated.moduleId, submoduleId: updated.submoduleId, key: updated.key },
      };
      await persistAuditLog(tx, auditPayload);
      return { auditPayload };
    });
    emitAuditLogEvent(result.auditPayload);
    revalidatePath("/app/admin/modules");
    revalidatePath("/modules");
    return { success: "Característica actualizada." };
  } catch (error) {
    return { error: mapModuleFeatureActionError(error, "No pudimos actualizar la característica.") };
  }
}

export async function deleteModuleFeatureAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);
    const parsed = deleteModuleFeatureSchema.safeParse({ featureId: formData.get("featureId") });
    if (!parsed.success) return { error: "Característica inválida." };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.moduleFeature.findUnique({
        where: { id: parsed.data.featureId },
        select: { id: true, moduleId: true, submoduleId: true, key: true },
      });
      if (!existing) throw new Error("MODULE_FEATURE_NOT_FOUND");
      await getBusinessFeatureScope(tx, existing);
      await tx.moduleFeature.delete({ where: { id: existing.id } });
      const auditPayload = {
        action: "platform.module_feature_deleted",
        targetType: "module_feature",
        targetId: existing.id,
        actorUserId: adminSession.user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { moduleId: existing.moduleId, submoduleId: existing.submoduleId, key: existing.key },
      };
      await persistAuditLog(tx, auditPayload);
      return { auditPayload };
    });
    emitAuditLogEvent(result.auditPayload);
    revalidatePath("/app/admin/modules");
    revalidatePath("/modules");
    return { success: "Característica eliminada." };
  } catch (error) {
    return { error: mapModuleFeatureActionError(error, "No pudimos eliminar la característica.") };
  }
}

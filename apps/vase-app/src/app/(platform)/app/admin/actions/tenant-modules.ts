"use server";

// Encender o apagar módulos y submódulos de una cuenta.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { setTenantModuleActivationSchema, setTenantSubmoduleActivationSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { userAccessModuleIds } from "@/lib/admin/user-access";
import { AdminGovernanceActionState } from "./shared";
import { resolveTenantPlanFromSubscription, syncTenantProductAndLabsWorkspace } from "./access-sync";

export async function setTenantModuleActivationAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = setTenantModuleActivationSchema.safeParse({
      tenantId: formData.get("tenantId"),
      moduleId: formData.get("moduleId"),
      isActive: formData.get("isActive") === "true",
    });
    if (!parsed.success) {
      return { error: "Datos de activaciÃ³n invÃ¡lidos." };
    }

    const [publishedArtifact, tenant, currentTenantModules] = await Promise.all([
      prisma.moduleArtifact.findFirst({
        where: { moduleId: parsed.data.moduleId, isPublished: true },
        orderBy: { publishedAt: "desc" },
        select: { id: true },
      }),
      prisma.tenant.findUnique({
        where: { id: parsed.data.tenantId },
        select: {
          id: true,
          name: true,
          billingEmail: true,
          subscription: {
            select: {
              plan: true,
              premiumEnabled: true,
            },
          },
        },
      }),
      prisma.tenantModule.findMany({
        where: {
          tenantId: parsed.data.tenantId,
          moduleId: { in: [userAccessModuleIds.business, userAccessModuleIds.labs] },
        },
        select: {
          moduleId: true,
          isActive: true,
        },
      }),
    ]);

    if (!tenant) {
      return { error: "Tenant no encontrado." };
    }

    const currentModuleState = new Map(currentTenantModules.map((module) => [module.moduleId, module.isActive]));
    if (parsed.data.moduleId === userAccessModuleIds.business || parsed.data.moduleId === userAccessModuleIds.labs) {
      currentModuleState.set(parsed.data.moduleId, parsed.data.isActive);
    }
    const activeModuleIds = [userAccessModuleIds.business, userAccessModuleIds.labs].filter(
      (moduleId) => currentModuleState.get(moduleId) === true,
    );
    const tenantPlan = resolveTenantPlanFromSubscription(tenant.subscription);

    await prisma.$transaction(async (tx) => {
      await tx.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: parsed.data.tenantId,
            moduleId: parsed.data.moduleId,
          },
        },
        update: {
          isActive: parsed.data.isActive,
          activatedAt: parsed.data.isActive ? new Date() : null,
          activeArtifactId: publishedArtifact?.id ?? null,
        },
        create: {
          tenantId: parsed.data.tenantId,
          moduleId: parsed.data.moduleId,
          isActive: parsed.data.isActive,
          activatedAt: parsed.data.isActive ? new Date() : null,
          activeArtifactId: publishedArtifact?.id ?? null,
        },
      });

      await syncTenantProductAndLabsWorkspace({
        tx,
        tenantId: parsed.data.tenantId,
        moduleIds: activeModuleIds,
        tenantPlan,
        tenantName: tenant.name,
        userEmail: tenant.billingEmail || "",
      });
    });

    await createAuditLog({
      action: "platform.tenant_module_activation_updated",
      targetType: "tenant_module",
      targetId: `${parsed.data.tenantId}:${parsed.data.moduleId}`,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { isActive: parsed.data.isActive },
    });

    revalidatePath("/app/admin/modules");
    return { success: parsed.data.isActive ? "MÃ³dulo activado para tenant." : "MÃ³dulo desactivado para tenant." };
  } catch {
    return { error: "No pudimos actualizar la activaciÃ³n del mÃ³dulo." };
  }
}

export async function setTenantSubmoduleActivationAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = setTenantSubmoduleActivationSchema.safeParse({
      tenantId: formData.get("tenantId"),
      submoduleId: formData.get("submoduleId"),
      isActive: formData.get("isActive") === "true",
    });
    if (!parsed.success) {
      return { error: "Datos de activaciÃ³n invÃ¡lidos." };
    }

    const submodule = await prisma.moduleSubmodule.findUnique({
      where: { id: parsed.data.submoduleId },
      select: { moduleId: true },
    });
    if (!submodule) {
      return { error: "SubmÃ³dulo no encontrado." };
    }

    if (parsed.data.isActive) {
      const parentActivation = await prisma.tenantModule.findUnique({
        where: {
          tenantId_moduleId: {
            tenantId: parsed.data.tenantId,
            moduleId: submodule.moduleId,
          },
        },
        select: { isActive: true },
      });
      if (!parentActivation?.isActive) {
        return { error: "Primero debes activar el mÃ³dulo padre para este tenant." };
      }
    }

    const publishedArtifact = await prisma.moduleArtifact.findFirst({
      where: { submoduleId: parsed.data.submoduleId, isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: { id: true },
    });

    await prisma.tenantSubmodule.upsert({
      where: {
        tenantId_submoduleId: {
          tenantId: parsed.data.tenantId,
          submoduleId: parsed.data.submoduleId,
        },
      },
      update: {
        isActive: parsed.data.isActive,
        activatedAt: parsed.data.isActive ? new Date() : null,
        activeArtifactId: publishedArtifact?.id ?? null,
      },
      create: {
        tenantId: parsed.data.tenantId,
        submoduleId: parsed.data.submoduleId,
        isActive: parsed.data.isActive,
        activatedAt: parsed.data.isActive ? new Date() : null,
        activeArtifactId: publishedArtifact?.id ?? null,
      },
    });

    await createAuditLog({
      action: "platform.tenant_submodule_activation_updated",
      targetType: "tenant_submodule",
      targetId: `${parsed.data.tenantId}:${parsed.data.submoduleId}`,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { isActive: parsed.data.isActive },
    });

    revalidatePath("/app/admin/modules");
    return { success: parsed.data.isActive ? "SubmÃ³dulo activado para tenant." : "SubmÃ³dulo desactivado para tenant." };
  } catch {
    return { error: "No pudimos actualizar la activaciÃ³n del submÃ³dulo." };
  }
}

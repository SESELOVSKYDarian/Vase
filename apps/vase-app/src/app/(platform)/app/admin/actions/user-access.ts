"use server";

// Guardar de una vez los accesos de un usuario a sus cuentas.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { updateUserTenantAccessSnapshotSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { AdminGovernanceActionState } from "./shared";
import { resolveTenantPlanFromSubscription, syncTenantProductAndLabsWorkspace, syncUserModuleAccess } from "./access-sync";

export async function updateUserTenantAccessSnapshotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const payloadRaw = String(formData.get("payload") ?? "");
    const payload = JSON.parse(payloadRaw || "{}");
    const parsed = updateUserTenantAccessSnapshotSchema.safeParse(payload);

    if (!parsed.success) {
      return { error: "Datos invalidos. Revisa rol, estado y accesos del modulo." };
    }

    await ensureModuleCatalogSynced();

    const [user, tenant, submoduleCatalog] = await Promise.all([
      prisma.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, email: true },
      }),
      prisma.tenant.findUnique({
        where: { id: parsed.data.tenantId },
        select: {
          id: true,
          accountName: true,
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
      prisma.moduleSubmodule.findMany({
        where: {
          id: { in: parsed.data.modules.flatMap((module) => module.submodules.map((submodule) => submodule.submoduleId)) },
        },
        select: { id: true, moduleId: true, key: true },
      }),
    ]);

    if (!user || !tenant) {
      return { error: "No encontramos el usuario o tenant seleccionado." };
    }

    const submoduleParentMap = new Map(submoduleCatalog.map((item) => [item.id, item.moduleId]));
    const submoduleKeyMap = new Map(submoduleCatalog.map((item) => [item.id, item.key]));
    const moduleStateMap = new Map(parsed.data.modules.map((module) => [module.moduleId, module.isActive]));
    const activeModuleIds = parsed.data.modules
      .filter((module) => module.isActive)
      .map((module) => module.moduleId);
    const tenantPlan = resolveTenantPlanFromSubscription(tenant.subscription);

    for (const moduleAccess of parsed.data.modules) {
      for (const submodule of moduleAccess.submodules) {
        const parentModuleId = submoduleParentMap.get(submodule.submoduleId);
        if (!parentModuleId) {
          return { error: "Hay funcionalidades que ya no existen. Recarga la pagina e intenta de nuevo." };
        }
        if (submodule.isActive && !moduleStateMap.get(parentModuleId)) {
          return { error: "No puedes activar funcionalidades con el modulo padre desactivado." };
        }
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          userId_tenantId: {
            userId: parsed.data.userId,
            tenantId: parsed.data.tenantId,
          },
        },
        update: {
          role: parsed.data.tenantRole,
          status: parsed.data.membershipStatus,
        },
        create: {
          userId: parsed.data.userId,
          tenantId: parsed.data.tenantId,
          role: parsed.data.tenantRole,
          status: parsed.data.membershipStatus,
        },
      });

      for (const moduleAccess of parsed.data.modules) {
        const publishedArtifact = await tx.moduleArtifact.findFirst({
          where: { moduleId: moduleAccess.moduleId, isPublished: true },
          orderBy: { publishedAt: "desc" },
          select: { id: true },
        });

        await tx.tenantModule.upsert({
          where: {
            tenantId_moduleId: {
              tenantId: parsed.data.tenantId,
              moduleId: moduleAccess.moduleId,
            },
          },
          update: {
            isActive: moduleAccess.isActive,
            activatedAt: moduleAccess.isActive ? now : null,
            activeArtifactId: publishedArtifact?.id ?? null,
          },
          create: {
            tenantId: parsed.data.tenantId,
            moduleId: moduleAccess.moduleId,
            isActive: moduleAccess.isActive,
            activatedAt: moduleAccess.isActive ? now : null,
            activeArtifactId: publishedArtifact?.id ?? null,
          },
        });
      }

      await syncUserModuleAccess({
        tx,
        userId: parsed.data.userId,
        moduleIds: activeModuleIds,
      });

      await syncTenantProductAndLabsWorkspace({
        tx,
        tenantId: parsed.data.tenantId,
        moduleIds: activeModuleIds,
        tenantPlan,
        labsSubmodules: parsed.data.modules.flatMap((moduleAccess) =>
          moduleAccess.submodules
            .filter((submodule) => submodule.isActive && moduleAccess.isActive)
            .map((submodule) => ({
              moduleId: submoduleParentMap.get(submodule.submoduleId) ?? "",
              key: submoduleKeyMap.get(submodule.submoduleId) ?? null,
              isActive: true,
            })),
        ),
        tenantName: tenant.name,
        userEmail: user.email || tenant.billingEmail || "",
      });

      for (const moduleAccess of parsed.data.modules) {
        for (const submodule of moduleAccess.submodules) {
          const publishedArtifact = await tx.moduleArtifact.findFirst({
            where: { submoduleId: submodule.submoduleId, isPublished: true },
            orderBy: { publishedAt: "desc" },
            select: { id: true },
          });

          await tx.tenantSubmodule.upsert({
            where: {
              tenantId_submoduleId: {
                tenantId: parsed.data.tenantId,
                submoduleId: submodule.submoduleId,
              },
            },
            update: {
              isActive: submodule.isActive && moduleAccess.isActive,
              activatedAt: submodule.isActive && moduleAccess.isActive ? now : null,
              activeArtifactId: publishedArtifact?.id ?? null,
            },
            create: {
              tenantId: parsed.data.tenantId,
              submoduleId: submodule.submoduleId,
              isActive: submodule.isActive && moduleAccess.isActive,
              activatedAt: submodule.isActive && moduleAccess.isActive ? now : null,
              activeArtifactId: publishedArtifact?.id ?? null,
            },
          });
        }
      }
    });

    await createAuditLog({
      action: "platform.user_tenant_access_snapshot_updated",
      targetType: "membership",
      targetId: `${parsed.data.userId}:${parsed.data.tenantId}`,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        userEmail: user.email,
        tenant: tenant.accountName,
        tenantRole: parsed.data.tenantRole,
        membershipStatus: parsed.data.membershipStatus,
        modules: parsed.data.modules.map((module) => ({
          moduleId: module.moduleId,
          isActive: module.isActive,
          activeSubmodules: module.submodules.filter((submodule) => submodule.isActive).map((submodule) => submodule.submoduleId),
        })),
      },
    });

    revalidatePath("/app/admin/users");
    revalidatePath("/app/admin/modules");
    revalidatePath("/app");
    return { success: "Accesos guardados correctamente." };
  } catch {
    return { error: "No pudimos guardar los accesos del usuario." };
  }
}

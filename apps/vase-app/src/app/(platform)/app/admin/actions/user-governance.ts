"use server";

// Permisos de un usuario y a qué cuentas puede entrar.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { updateUserGovernanceSchema, updateUserTenantAccessSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { userAccessModuleIds } from "@/lib/admin/user-access";
import { AdminGovernanceActionState } from "./shared";
import { buildActiveAccessModuleIds, resolveTenantPlanFromSubscription, syncTenantProductAndLabsWorkspace, syncUserModuleAccess } from "./access-sync";

export async function updateUserGovernanceAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateUserGovernanceSchema.safeParse({
      userId: formData.get("userId"),
      platformRole: formData.get("platformRole"),
    });

    if (!parsed.success) {
      return { error: "Revisa el rol de plataforma antes de guardar." };
    }

    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        platformRole: parsed.data.platformRole,
      },
    });

    await createAuditLog({
      action: "platform.user_governance_updated",
      targetType: "user",
      targetId: user.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        platformRole: parsed.data.platformRole,
      },
    });

    revalidatePath("/app/admin");
    return { success: "Rol de usuario actualizado." };
  } catch {
    return { error: "No pudimos actualizar el usuario." };
  }
}

export async function updateUserTenantAccessAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateUserTenantAccessSchema.safeParse({
      userId: formData.get("userId"),
      tenantId: formData.get("tenantId"),
      tenantRole: formData.get("tenantRole"),
      membershipStatus: formData.get("membershipStatus"),
      businessAccess: formData.get("businessAccess") === "on",
      labsAccess: formData.get("labsAccess") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa usuario, tenant, rol y modulos antes de guardar." };
    }

    await ensureModuleCatalogSynced();

    const [user, tenant] = await Promise.all([
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
    ]);

    if (!user || !tenant) {
      return { error: "No encontramos el usuario o tenant seleccionado." };
    }

    const now = new Date();
    const activeModuleIds = buildActiveAccessModuleIds(parsed.data);
    const tenantPlan = resolveTenantPlanFromSubscription(tenant.subscription);

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

      await tx.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: parsed.data.tenantId,
            moduleId: userAccessModuleIds.business,
          },
        },
        update: {
          isActive: parsed.data.businessAccess,
          activatedAt: parsed.data.businessAccess ? now : null,
        },
        create: {
          tenantId: parsed.data.tenantId,
          moduleId: userAccessModuleIds.business,
          isActive: parsed.data.businessAccess,
          activatedAt: parsed.data.businessAccess ? now : null,
        },
      });

      await tx.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: parsed.data.tenantId,
            moduleId: userAccessModuleIds.labs,
          },
        },
        update: {
          isActive: parsed.data.labsAccess,
          activatedAt: parsed.data.labsAccess ? now : null,
        },
        create: {
          tenantId: parsed.data.tenantId,
          moduleId: userAccessModuleIds.labs,
          isActive: parsed.data.labsAccess,
          activatedAt: parsed.data.labsAccess ? now : null,
        },
      });

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
        tenantName: tenant.name,
        userEmail: user.email || tenant.billingEmail || "",
      });
    });

    await createAuditLog({
      action: "platform.user_tenant_access_updated",
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
        businessAccess: parsed.data.businessAccess,
        labsAccess: parsed.data.labsAccess,
      },
    });

    revalidatePath("/app/admin/users");
    revalidatePath("/app/admin/modules");
    revalidatePath("/app");
    return { success: "Acceso del usuario actualizado." };
  } catch {
    return { error: "No pudimos actualizar el acceso del usuario." };
  }
}

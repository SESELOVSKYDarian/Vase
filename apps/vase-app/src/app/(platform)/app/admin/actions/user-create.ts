"use server";

// Crear un usuario a mano desde el admin.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeText } from "@/lib/security/sanitize";
import { createManualUserByAdminSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { buildAdminCreatedUserVerification, userAccessModuleIds } from "@/lib/admin/user-access";
import { AdminGovernanceActionState } from "./shared";
import { buildActiveAccessModuleIds, resolveTenantPlanFromSubscription, syncTenantProductAndLabsWorkspace, syncUserModuleAccess } from "./access-sync";

export async function createManualUserByAdminAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createManualUserByAdminSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      tenantId: String(formData.get("tenantId") ?? ""),
      tenantRole: formData.get("tenantRole"),
      membershipStatus: formData.get("membershipStatus"),
      businessAccess: formData.get("businessAccess") === "on",
      labsAccess: formData.get("labsAccess") === "on",
      forcePasswordChange: formData.get("forcePasswordChange") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, email, contrasena y acceso al tenant." };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) {
      return { error: "Ya existe un usuario con ese email." };
    }

    const tenantId = parsed.data.tenantId ? parsed.data.tenantId : null;
    let tenantForManualAccess: {
      id: string;
      name: string;
      billingEmail: string | null;
      subscription: {
        plan: "START" | "PREMIUM";
        premiumEnabled: boolean;
      } | null;
    } | null = null;

    if (tenantId) {
      await ensureModuleCatalogSynced();
      tenantForManualAccess = await prisma.tenant.findUnique({
        where: { id: tenantId },
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
      });
      if (!tenantForManualAccess) {
        return { error: "El tenant seleccionado no existe." };
      }
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();
    const activeModuleIds = buildActiveAccessModuleIds(parsed.data);
    const tenantPlan = resolveTenantPlanFromSubscription(tenantForManualAccess?.subscription);

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          platformRole: "USER",
          locale: "es",
          ...buildAdminCreatedUserVerification(now),
          forcePasswordChange: parsed.data.forcePasswordChange,
          tempPasswordIssuedAt: parsed.data.forcePasswordChange ? now : null,
          passwordChangedAt: now,
        },
      });

      if (tenantId) {
        await tx.membership.upsert({
          where: {
            userId_tenantId: {
              userId: user.id,
              tenantId,
            },
          },
          update: {
            role: parsed.data.tenantRole,
            status: parsed.data.membershipStatus,
          },
          create: {
            userId: user.id,
            tenantId,
            role: parsed.data.tenantRole,
            status: parsed.data.membershipStatus,
          },
        });

        await tx.tenantModule.upsert({
          where: {
            tenantId_moduleId: {
              tenantId,
              moduleId: userAccessModuleIds.business,
            },
          },
          update: {
            isActive: parsed.data.businessAccess,
            activatedAt: parsed.data.businessAccess ? now : null,
          },
          create: {
            tenantId,
            moduleId: userAccessModuleIds.business,
            isActive: parsed.data.businessAccess,
            activatedAt: parsed.data.businessAccess ? now : null,
          },
        });

        await tx.tenantModule.upsert({
          where: {
            tenantId_moduleId: {
              tenantId,
              moduleId: userAccessModuleIds.labs,
            },
          },
          update: {
            isActive: parsed.data.labsAccess,
            activatedAt: parsed.data.labsAccess ? now : null,
          },
          create: {
            tenantId,
            moduleId: userAccessModuleIds.labs,
            isActive: parsed.data.labsAccess,
            activatedAt: parsed.data.labsAccess ? now : null,
          },
        });

        await syncUserModuleAccess({
          tx,
          userId: user.id,
          moduleIds: activeModuleIds,
        });

        await syncTenantProductAndLabsWorkspace({
          tx,
          tenantId,
          moduleIds: activeModuleIds,
          tenantPlan,
          tenantName: tenantForManualAccess?.name ?? parsed.data.name,
          userEmail: parsed.data.email || tenantForManualAccess?.billingEmail || "",
        });
      }

      return user;
    });

    await createAuditLog({
      action: "platform.manual_user_created",
      targetType: "user",
      targetId: createdUser.id,
      tenantId: tenantId ?? undefined,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        email: createdUser.email,
        tenantId,
        tenantRole: tenantId ? parsed.data.tenantRole : null,
        membershipStatus: tenantId ? parsed.data.membershipStatus : null,
        businessAccess: tenantId ? parsed.data.businessAccess : null,
        labsAccess: tenantId ? parsed.data.labsAccess : null,
        emailVerifiedByAdmin: true,
        forcePasswordChange: parsed.data.forcePasswordChange,
      },
    });

    revalidatePath("/app/admin/users");
    revalidatePath("/app/admin");
    revalidatePath("/app");
    return { success: "Cuenta creada sin verificacion por email." };
  } catch {
    return { error: "No pudimos crear la cuenta manual." };
  }
}

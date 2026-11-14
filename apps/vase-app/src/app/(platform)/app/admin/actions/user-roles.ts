"use server";

// Usuarios desarrolladores, roles y proyectos con sus procesos.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createDeveloperUserSchema, createProjectWithProcessesSchema, upsertUserRolesSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { buildAdminCreatedUserVerification } from "@/lib/admin/user-access";
import { AdminGovernanceActionState, generateTemporaryPassword } from "./shared";

export async function createDeveloperUserAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createDeveloperUserSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      specialty: sanitizeNullableText(String(formData.get("specialty") ?? "")) ?? undefined,
      phone: sanitizeNullableText(String(formData.get("phone") ?? "")) ?? undefined,
    });
    if (!parsed.success) {
      return { error: "Revisa nombre, email y datos del desarrollador." };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) return { error: "Ya existe un usuario con ese email." };

    const temporaryPassword = parsed.data.password || generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const now = new Date();

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        platformRole: "DEVELOPER",
        locale: "es",
        ...buildAdminCreatedUserVerification(now),
        forcePasswordChange: true,
        tempPasswordIssuedAt: now,
        internalProfile: {
          create: {
            type: "DEVELOPER",
            specialty: parsed.data.specialty ?? null,
            phone: parsed.data.phone ?? null,
            tempPasswordActive: true,
            mustResetPassword: true,
            tempPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
          },
        },
      },
    });

    await createAuditLog({
      action: "platform.developer_user_created",
      targetType: "user",
      targetId: user.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        role: "DEVELOPER",
        specialty: parsed.data.specialty ?? null,
      },
    });

    revalidatePath("/app/admin");
    return { success: `Desarrollador creado. Contrasena temporal: ${temporaryPassword}` };
  } catch {
    return { error: "No pudimos crear el desarrollador." };
  }
}

export async function upsertUserRolesAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = upsertUserRolesSchema.safeParse({
      userId: formData.get("userId"),
      roles: formData.getAll("roles"),
    });

    if (!parsed.success) {
      return { error: "Revisa el usuario y los roles asignados." };
    }

    await prisma.$transaction(async (tx) => {
      for (const roleKey of parsed.data.roles) {
        await tx.role.upsert({
          where: { key: roleKey },
          update: {
            name: roleKey,
          },
          create: {
            key: roleKey,
            name: roleKey,
            isSystem: true,
          },
        });
      }

      const roleRecords = await tx.role.findMany({
        where: { key: { in: parsed.data.roles } },
        select: { id: true },
      });
      const roleIds = roleRecords.map((role) => role.id);

      await tx.userRole.deleteMany({
        where: { userId: parsed.data.userId },
      });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: parsed.data.userId,
            roleId,
          })),
        });
      }
    });

    await createAuditLog({
      action: "platform.user_roles_updated",
      targetType: "user",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        roles: parsed.data.roles,
      },
    });

    revalidatePath("/app/admin/users");
    return { success: "Roles del usuario actualizados." };
  } catch {
    return { error: "No pudimos actualizar los roles del usuario." };
  }
}

export async function createProjectWithProcessesAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createProjectWithProcessesSchema.safeParse({
      tenantId: formData.get("tenantId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      slug: sanitizeText(String(formData.get("slug") ?? "")).toLowerCase(),
      status: formData.get("status"),
      moduleId: String(formData.get("moduleId") ?? ""),
      submoduleId: String(formData.get("submoduleId") ?? ""),
      clientAccountId: String(formData.get("clientAccountId") ?? ""),
      description: sanitizeNullableText(String(formData.get("description") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return { error: "Revisa tenant, nombre y estado del proyecto." };
    }

    const processTypes = ["DISCOVERY", "DESIGN", "FRONTEND", "BACKEND", "INTEGRATIONS", "TESTING", "DEPLOYMENT"] as const;

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          tenantId: parsed.data.tenantId,
          name: parsed.data.name,
          slug: parsed.data.slug,
          status: parsed.data.status,
          moduleId: parsed.data.moduleId || null,
          submoduleId: parsed.data.submoduleId || null,
          clientAccountId: parsed.data.clientAccountId || null,
          description: parsed.data.description || null,
          createdById: adminSession.user.id,
        },
      });

      await tx.projectProcess.createMany({
        data: processTypes.map((processType) => ({
          projectId: created.id,
          processType,
          status: processType === "DISCOVERY" ? "IN_PROGRESS" : "PENDING",
          progressPercent: processType === "DISCOVERY" ? 5 : 0,
        })),
      });

      return created;
    });

    await createAuditLog({
      action: "platform.project_created_with_processes",
      targetType: "project",
      targetId: project.id,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        slug: parsed.data.slug,
        status: parsed.data.status,
      },
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/business");
    return { success: "Proyecto creado con procesos base." };
  } catch {
    return { error: "No pudimos crear el proyecto con sus procesos." };
  }
}

"use server";

// Usuarios de soporte y sus plantillas de respuesta.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createSupportUserSchema, updateSupportTemplateAdminSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { buildAdminCreatedUserVerification } from "@/lib/admin/user-access";
import { AdminGovernanceActionState, generateTemporaryPassword } from "./shared";

export async function createSupportUserAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createSupportUserSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      platformRole: formData.get("platformRole"),
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, email, password y rol antes de crear el usuario." };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existing) {
      return { error: "Ya existe un usuario con ese email." };
    }

    const temporaryPassword = parsed.data.password || generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const now = new Date();
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        platformRole: parsed.data.platformRole,
        locale: "es",
        ...buildAdminCreatedUserVerification(now),
        forcePasswordChange: true,
        tempPasswordIssuedAt: now,
        internalProfile: {
          create: {
            type: "SUPPORT",
            tempPasswordActive: true,
            mustResetPassword: true,
            tempPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
            availability: "OFFLINE",
          },
        },
      },
    });

    await createAuditLog({
      action: "platform.support_user_created",
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
    return { success: `Usuario interno creado. Contrasena temporal: ${temporaryPassword}` };
  } catch {
    return { error: "No pudimos crear el usuario interno." };
  }
}


export async function updateSupportReplyTemplateAdminAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateSupportTemplateAdminSchema.safeParse({
      templateId: formData.get("templateId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      body: sanitizeText(String(formData.get("body") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, categoria, cuerpo y estado del template." };
    }

    const template = await prisma.supportReplyTemplate.update({
      where: { id: parsed.data.templateId },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        body: parsed.data.body,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.support_template_updated",
      targetType: "support_reply_template",
      targetId: template.id,
      tenantId: template.tenantId ?? undefined,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/support");
    return { success: "Respuesta base actualizada." };
  } catch {
    return { error: "No pudimos actualizar la respuesta base." };
  }
}

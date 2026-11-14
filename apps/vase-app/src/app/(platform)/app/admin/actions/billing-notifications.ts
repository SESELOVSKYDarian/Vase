"use server";

// Facturación de una cuenta y avisos del admin.
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createAdminNotificationSchema, updateBillingSnapshotSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState, toNullableDate } from "./shared";

export async function updateTenantBillingSnapshotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.BILLING);
    const parsed = updateBillingSnapshotSchema.safeParse({
      tenantId: formData.get("tenantId"),
      paidAt: String(formData.get("paidAt") ?? "").trim() || undefined,
      nextBillingAt: String(formData.get("nextBillingAt") ?? "").trim() || undefined,
      hostingEndsAt: String(formData.get("hostingEndsAt") ?? "").trim() || undefined,
      maintenanceEndsAt: String(formData.get("maintenanceEndsAt") ?? "").trim() || undefined,
      cancelPlan: formData.get("cancelPlan") === "true",
      cancelReason: sanitizeNullableText(String(formData.get("cancelReason") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Datos de billing invalidos." };

    const previousSubscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId: parsed.data.tenantId },
      select: {
        paidAt: true,
        nextBillingAt: true,
        hostingEndsAt: true,
        maintenanceEndsAt: true,
        billingStatus: true,
        canceledAt: true,
        cancelReason: true,
      },
    });

    await prisma.tenantSubscription.upsert({
      where: { tenantId: parsed.data.tenantId },
      update: {
        paidAt: toNullableDate(parsed.data.paidAt ?? ""),
        nextBillingAt: toNullableDate(parsed.data.nextBillingAt ?? ""),
        hostingEndsAt: toNullableDate(parsed.data.hostingEndsAt ?? ""),
        maintenanceEndsAt: toNullableDate(parsed.data.maintenanceEndsAt ?? ""),
        canceledAt: parsed.data.cancelPlan ? new Date() : null,
        cancelReason: parsed.data.cancelPlan ? parsed.data.cancelReason ?? "Cancelado por administrador." : null,
        canceledByUserId: parsed.data.cancelPlan ? adminSession.user.id : null,
        billingStatus: parsed.data.cancelPlan ? "CANCELED" : undefined,
      },
      create: {
        tenantId: parsed.data.tenantId,
        paidAt: toNullableDate(parsed.data.paidAt ?? ""),
        nextBillingAt: toNullableDate(parsed.data.nextBillingAt ?? ""),
        hostingEndsAt: toNullableDate(parsed.data.hostingEndsAt ?? ""),
        maintenanceEndsAt: toNullableDate(parsed.data.maintenanceEndsAt ?? ""),
        canceledAt: parsed.data.cancelPlan ? new Date() : null,
        cancelReason: parsed.data.cancelPlan ? parsed.data.cancelReason ?? "Cancelado por administrador." : null,
        canceledByUserId: parsed.data.cancelPlan ? adminSession.user.id : null,
        billingStatus: parsed.data.cancelPlan ? "CANCELED" : "TRIAL",
      },
    });

    await createAuditLog({
      action: "platform.tenant_billing_snapshot_updated",
      targetType: "tenant_subscription",
      targetId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      metadata: {
        before: previousSubscription,
        after: {
          paidAt: parsed.data.paidAt ?? null,
          nextBillingAt: parsed.data.nextBillingAt ?? null,
          hostingEndsAt: parsed.data.hostingEndsAt ?? null,
          maintenanceEndsAt: parsed.data.maintenanceEndsAt ?? null,
          cancelPlan: parsed.data.cancelPlan ?? false,
          cancelReason: parsed.data.cancelReason ?? null,
        },
      },
    });
    revalidatePath("/app/admin");
    return { success: "Snapshot de billing actualizado." };
  } catch {
    return { error: "No pudimos actualizar billing." };
  }
}

export async function createAdminNotificationAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.NOTIFICATIONS);
    const parsed = createAdminNotificationSchema.safeParse({
      title: sanitizeText(String(formData.get("title") ?? "")),
      message: sanitizeText(String(formData.get("message") ?? "")),
      tone: formData.get("tone"),
      category: formData.get("category"),
      target: formData.get("target"),
      tenantId: String(formData.get("tenantId") ?? "").trim() || undefined,
      targetRole: (String(formData.get("targetRole") ?? "").trim() || undefined) as "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER" | undefined,
      targetUserIds: String(formData.get("targetUserIds") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
      startsAt: String(formData.get("startsAt") ?? "").trim() || undefined,
      endsAt: String(formData.get("endsAt") ?? "").trim() || undefined,
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return { error: "No pudimos validar la notificacion." };

    const createdNotification = await prisma.adminNotification.create({
      data: {
        title: parsed.data.title,
        message: parsed.data.message,
        tone: parsed.data.tone,
        category: parsed.data.category,
        target: parsed.data.target,
        tenantId: parsed.data.tenantId ?? null,
        targetRole: parsed.data.targetRole ?? null,
        targetUserIds: parsed.data.targetUserIds,
        startsAt: toNullableDate(parsed.data.startsAt ?? ""),
        endsAt: toNullableDate(parsed.data.endsAt ?? ""),
        isActive: parsed.data.isActive,
        createdByUserId: adminSession.user.id,
      },
    });

    await createAuditLog({
      action: "platform.admin_notification_created",
      targetType: "admin_notification",
      targetId: createdNotification.id,
      actorUserId: adminSession.user.id,
      metadata: {
        before: null,
        after: {
          title: createdNotification.title,
          target: createdNotification.target,
          tone: createdNotification.tone,
          category: createdNotification.category,
          tenantId: createdNotification.tenantId,
          targetRole: createdNotification.targetRole,
          targetUserIds: createdNotification.targetUserIds,
        },
      },
    });
    revalidatePath("/app/admin");
    revalidatePath("/app");
    return { success: "Notificacion creada." };
  } catch {
    return { error: "No pudimos crear la notificacion." };
  }
}

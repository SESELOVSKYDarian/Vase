"use server";

// Ajustes de finanzas, socios y planes.
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { updateFinancialSettingsSchema, upsertTokenPlanSettingSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";

export async function updateFinancialSettingsAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateFinancialSettingsSchema.safeParse({
    hostingMonthlyPrice: formData.get("hostingMonthlyPrice"),
    hostingYearlyPrice: formData.get("hostingYearlyPrice"),
    maintenanceMonthlyPrice: formData.get("maintenanceMonthlyPrice"),
    tokensDefaultToFund: formData.get("tokensDefaultToFund") === "on",
    maxSupportTickets: formData.get("maxSupportTickets"),
  });
  if (!parsed.success) return;

  const existing = await prisma.financialSettings.findFirst({
    where: { tenantId: null },
    orderBy: { updatedAt: "desc" },
  });
  const updated = existing
    ? await prisma.financialSettings.update({
        where: { id: existing.id },
        data: parsed.data,
      })
    : await prisma.financialSettings.create({
        data: {
          tenantId: null,
          ...parsed.data,
        },
      });

  await createAuditLog({
    action: "platform.financial_settings_updated",
    targetType: "financial_settings",
    targetId: updated.id,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: parsed.data,
  });
  revalidatePath("/app/admin/settings");
}

export async function upsertTokenPlanSettingAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = upsertTokenPlanSettingSchema.safeParse({
    key: String(formData.get("key") ?? "").toUpperCase(),
    price: formData.get("price"),
    tokenAmount: formData.get("tokenAmount"),
    estimatedMessages: sanitizeNullableText(String(formData.get("estimatedMessages") ?? "")) ?? undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return;

  const previous = await prisma.tokenPlanSetting.findFirst({
    where: {
      tenantId: null,
      key: parsed.data.key,
    },
  });

  const saved = previous
    ? await prisma.tokenPlanSetting.update({
        where: { id: previous.id },
        data: {
          price: parsed.data.price,
          tokenAmount: parsed.data.tokenAmount,
          estimatedMessages: parsed.data.estimatedMessages || null,
          isActive: parsed.data.isActive,
        },
      })
    : await prisma.tokenPlanSetting.create({
        data: {
          tenantId: null,
          key: parsed.data.key,
          price: parsed.data.price,
          tokenAmount: parsed.data.tokenAmount,
          estimatedMessages: parsed.data.estimatedMessages || null,
          isActive: parsed.data.isActive,
        },
      });

  await createAuditLog({
    action: "platform.token_plan_setting_upserted",
    targetType: "token_plan_setting",
    targetId: saved.id,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before: previous, after: saved },
  });

  revalidatePath("/app/admin/settings");
}

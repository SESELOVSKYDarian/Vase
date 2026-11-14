"use server";

// Gobierno de una cuenta y encendido de funciones.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { toggleFeatureFlagSchema, updateTenantGovernanceSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "./shared";

export async function updateTenantGovernanceAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateTenantGovernanceSchema.safeParse({
      tenantId: formData.get("tenantId"),
      status: formData.get("status"),
      plan: formData.get("plan"),
      billingStatus: formData.get("billingStatus"),
      premiumEnabled: formData.get("premiumEnabled") === "on",
      customDomainEnabled: formData.get("customDomainEnabled") === "on",
      temporaryPagesEnabled: formData.get("temporaryPagesEnabled") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa estado, plan y flags de gobierno antes de guardar." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: parsed.data.tenantId },
        data: {
          status: parsed.data.status,
        },
      });

      await tx.tenantSubscription.upsert({
        where: { tenantId: parsed.data.tenantId },
        update: {
          plan: parsed.data.plan,
          billingStatus: parsed.data.billingStatus,
          premiumEnabled: parsed.data.premiumEnabled,
          customDomainEnabled: parsed.data.customDomainEnabled,
          temporaryPagesEnabled: parsed.data.temporaryPagesEnabled,
        },
        create: {
          tenantId: parsed.data.tenantId,
          plan: parsed.data.plan,
          billingStatus: parsed.data.billingStatus,
          premiumEnabled: parsed.data.premiumEnabled,
          customDomainEnabled: parsed.data.customDomainEnabled,
          temporaryPagesEnabled: parsed.data.temporaryPagesEnabled,
        },
      });
    });

    await createAuditLog({
      action: "platform.tenant_governance_updated",
      targetType: "tenant",
      targetId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        status: parsed.data.status,
        plan: parsed.data.plan,
        billingStatus: parsed.data.billingStatus,
        premiumEnabled: parsed.data.premiumEnabled,
      },
    });

    revalidatePath("/app/admin");
    return { success: "Gobierno del tenant actualizado." };
  } catch {
    return { error: "No pudimos actualizar el tenant." };
  }
}

export async function toggleFeatureFlagAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = toggleFeatureFlagSchema.safeParse({
      flagId: formData.get("flagId"),
      enabled: formData.get("enabled") === "true",
    });

    if (!parsed.success) {
      return { error: "No pudimos interpretar el cambio del feature flag." };
    }

    const flag = await prisma.featureFlag.update({
      where: { id: parsed.data.flagId },
      data: {
        enabled: parsed.data.enabled,
      },
    });

    await createAuditLog({
      action: "platform.feature_flag_updated",
      targetType: "feature_flag",
      targetId: flag.id,
      tenantId: flag.tenantId ?? undefined,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        enabled: parsed.data.enabled,
        key: flag.key,
      },
    });

    revalidatePath("/app/admin");
    return { success: "Feature flag actualizado." };
  } catch {
    return { error: "No pudimos actualizar el feature flag." };
  }
}

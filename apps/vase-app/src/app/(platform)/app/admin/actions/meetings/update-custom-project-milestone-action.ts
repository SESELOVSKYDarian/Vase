"use server";

// Parte de meetings.ts: updateCustomProjectMilestoneAction.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "../shared";

export async function updateCustomProjectMilestoneAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const requestId = String(formData.get("requestId") ?? "");
    const stage = String(formData.get("stage") ?? "");
    const progressPercent = Number(formData.get("progressPercent") ?? 0);
    const tenantId = String(formData.get("tenantId") ?? "");
    const notes = sanitizeNullableText(String(formData.get("notes") ?? ""));
    if (!requestId || !tenantId || !stage) return { error: "Faltan datos de etapa." };

    await prisma.customProjectMilestone.upsert({
      where: {
        customPageRequestId_stage: {
          customPageRequestId: requestId,
          stage: stage as "DEFINITION" | "DESIGN" | "DELIVERY" | "FOLLOW_UP",
        },
      },
      update: {
        progressPercent: Math.max(0, Math.min(100, progressPercent)),
        notes: notes ?? null,
        isEnabledByAdmin: true,
        status: "ENABLED",
        updatedByUserId: adminSession.user.id,
        enabledAt: new Date(),
      },
      create: {
        customPageRequestId: requestId,
        tenantId,
        stage: stage as "DEFINITION" | "DESIGN" | "DELIVERY" | "FOLLOW_UP",
        progressPercent: Math.max(0, Math.min(100, progressPercent)),
        notes: notes ?? null,
        isEnabledByAdmin: true,
        status: "ENABLED",
        updatedByUserId: adminSession.user.id,
        enabledAt: new Date(),
      },
    });

    await createAuditLog({
      action: "platform.custom_project_milestone_updated",
      targetType: "custom_project_milestone",
      actorUserId: adminSession.user.id,
      metadata: { requestId, stage, progressPercent },
    });
    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner/customizations");
    return { success: "Etapa actualizada para el cliente." };
  } catch {
    return { error: "No pudimos actualizar la etapa." };
  }
}

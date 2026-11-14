"use server";

// Parte de actions.ts: requestPremiumPlanAction, requestCustomProjectMeetingAction, createProjectUpdateAction.
import { revalidatePath } from "next/cache";
import { type AuthActionState } from "@/app/(auth)/actions";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createProjectUpdateSchema } from "@/lib/validators/project";
import { createAuditLog } from "@/server/services/audit-log";
import { CustomProjectMeetingTypeInput, customProjectMeetingTypes } from "./ensure-project-created-from-accepted-quote";

export async function requestPremiumPlanAction(): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.OWNER);

  await prisma.featureFlag.upsert({
    where: {
      tenantId_key: {
        tenantId: membership.tenantId,
        key: "premium_interest",
      },
    },
    update: {
      enabled: true,
    },
    create: {
      tenantId: membership.tenantId,
      key: "premium_interest",
      description: "Tenant interesado en upgrade premium.",
      enabled: true,
    },
  });

  await createAuditLog({
    action: "business.premium_requested",
    targetType: "tenant_subscription",
    tenantId: membership.tenantId,
    actorUserId: verifiedSession.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  revalidatePath("/app/owner");
  return {
    success: "Registramos tu interes por Premium. El siguiente paso es contacto comercial o billing.",
  };
}

export async function requestCustomProjectMeetingAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.MANAGER);
  const requestId = String(formData.get("requestId") ?? "");
  const meetingType = String(formData.get("meetingType") ?? "");
  const requestedDateRaw = String(formData.get("requestedDate") ?? "");
  if (!customProjectMeetingTypes.has(meetingType as CustomProjectMeetingTypeInput)) {
    return { error: "Tipo de reunion invalido." };
  }
  if (!requestId || !meetingType || !requestedDateRaw) {
    return { error: "Completa tipo de reunion y fecha solicitada." };
  }

  const meeting = await prisma.customProjectMeeting.findUnique({
    where: { customPageRequestId_type: { customPageRequestId: requestId, type: meetingType as CustomProjectMeetingTypeInput } },
    select: { id: true, isEnabledByAdmin: true, tenantId: true },
  });

  if (!meeting || !meeting.isEnabledByAdmin || meeting.tenantId !== membership.tenantId) {
    return { error: "Esta reunion aun no fue habilitada por administracion." };
  }

  await prisma.customProjectMeeting.update({
    where: { id: meeting.id },
    data: {
      status: "REQUESTED",
      requestedByUserId: verifiedSession.user.id,
      requestedAt: new Date(),
      requestedDate: new Date(requestedDateRaw),
    },
  });

  revalidatePath("/app/business");
  revalidatePath("/app/owner/customizations");
  return { success: "Solicitud de reunion enviada. Te confirmaremos fecha final." };
}

export async function createProjectUpdateAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const session = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.MEMBER);

  const parsed = createProjectUpdateSchema.safeParse({
    projectId: formData.get("projectId"),
    processId: sanitizeNullableText(String(formData.get("processId") ?? "")) ?? undefined,
    title: sanitizeText(String(formData.get("title") ?? "")),
    content: sanitizeText(String(formData.get("content") ?? "")),
    progressIncrease: Number(formData.get("progressIncrease") ?? 0),
    notifyClient: formData.get("notifyClient") === "on",
  });
  if (!parsed.success) {
    return {
      error: "Revisa titulo, contenido y progreso del avance.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, tenantId: membership.tenantId },
    select: { id: true, progressPercent: true },
  });
  if (!project) return { error: "Proyecto no encontrado en tu tenant." };

  const nextProgress = Math.max(0, Math.min(100, project.progressPercent + parsed.data.progressIncrease));

  await prisma.$transaction(async (tx) => {
    await tx.projectUpdate.create({
      data: {
        projectId: project.id,
        actorUserId: session.user.id,
        title: parsed.data.title,
        body: parsed.data.content,
        notifyClient: parsed.data.notifyClient,
        metadata: {
          progressIncrease: parsed.data.progressIncrease,
          processId: parsed.data.processId ?? null,
        },
      },
    });

    await tx.project.update({
      where: { id: project.id },
      data: { progressPercent: nextProgress },
    });

    if (parsed.data.processId) {
      const process = await tx.projectProcess.findFirst({
        where: { id: parsed.data.processId, projectId: project.id },
        select: { id: true, progressPercent: true },
      });
      if (process) {
        await tx.projectProcess.update({
          where: { id: process.id },
          data: {
            progressPercent: Math.max(
              0,
              Math.min(100, process.progressPercent + parsed.data.progressIncrease),
            ),
            lastUpdatedAt: new Date(),
            lastUpdatedByUserId: session.user.id,
            notifyClient: parsed.data.notifyClient,
          },
        });
      }
    }
  });

  await createAuditLog({
    action: "project.update_created",
    targetType: "project",
    targetId: project.id,
    tenantId: membership.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      title: parsed.data.title,
      progressIncrease: parsed.data.progressIncrease,
      notifyClient: parsed.data.notifyClient,
      processId: parsed.data.processId ?? null,
    },
  });

  revalidatePath("/app/business");
  return { success: "Avance registrado en timeline del proyecto." };
}

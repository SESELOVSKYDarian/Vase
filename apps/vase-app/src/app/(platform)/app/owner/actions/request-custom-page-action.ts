"use server";

// Parte de actions.ts: requestCustomPageAction.
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { type AuthActionState } from "@/app/(auth)/actions";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { validateUpload } from "@/lib/security/upload";
import { saveLocalUpload } from "@/lib/storage/local-upload";
import { requestCustomPageSchema } from "@/lib/validators/business";
import { createAuditLog } from "@/server/services/audit-log";
import { createAutoAdminNotification } from "@/server/services/admin-notifications-auto";
import { validationErrorState } from "./ensure-project-created-from-accepted-quote";

export async function requestCustomPageAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const requestContext = await getRequestContext();
    const verifiedSession = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const businessSubmodules = await prisma.moduleSubmodule.findMany({
      where: { moduleId: "vase_business", isActive: true },
      select: {
        key: true,
        tenantLinks: {
          where: { tenantId: membership.tenantId },
          select: { isActive: true },
          take: 1,
        },
      },
    });
    const hasExplicitBusinessSubmoduleAccess = businessSubmodules.some((submodule) => submodule.tenantLinks.length > 0);
    const canRequestCustomBusiness =
      !hasExplicitBusinessSubmoduleAccess ||
      businessSubmodules.some((submodule) => submodule.key === "personalizado" && submodule.tenantLinks.some((link) => link.isActive));

    if (!canRequestCustomBusiness) {
      return { error: "Tu cuenta no tiene habilitado el submodulo personalizado de Vase Business." };
    }

    const parsed = requestCustomPageSchema.safeParse({
      businessObjective: sanitizeText(String(formData.get("businessObjective") ?? "")),
      pageScope: sanitizeText(String(formData.get("pageScope") ?? "")),
      businessDescription: sanitizeText(String(formData.get("businessDescription") ?? "")),
      desiredColors: sanitizeText(String(formData.get("desiredColors") ?? "")),
      brandStyle: sanitizeText(String(formData.get("brandStyle") ?? "")),
      desiredFeatures: sanitizeText(String(formData.get("desiredFeatures") ?? "")),
      visualReferences: sanitizeNullableText(String(formData.get("visualReferences") ?? "")),
      designReferences: sanitizeNullableText(String(formData.get("designReferences") ?? "")),
      requiredIntegrations: sanitizeNullableText(
        String(formData.get("requiredIntegrations") ?? ""),
      ),
      observations: sanitizeNullableText(String(formData.get("observations") ?? "")),
      notes: sanitizeNullableText(String(formData.get("notes") ?? "")),
      slotId: String(formData.get("slotId") ?? ""),
    });

    if (!parsed.success) {
      return validationErrorState(parsed.error.flatten().fieldErrors);
    }

    const files = formData
      .getAll("referenceFiles")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    const storedFiles: Array<{
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      storagePath: string;
    }> = [];

    for (const file of files) {
      const metadata = await validateUpload(file);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const relativePath = `business/custom-page-requests/${membership.tenantId}/${Date.now()}-${randomUUID()}-${metadata.originalName}`;
      const stored = await saveLocalUpload({ relativePath, bytes });
      storedFiles.push({
        fileName: metadata.originalName,
        mimeType: metadata.type,
        sizeBytes: metadata.size,
        storagePath: stored.relativePath,
      });
    }

    const selectedSlot = await prisma.meetingAvailabilitySlot.findFirst({
      where: {
        id: parsed.data.slotId,
        tenantId: membership.tenantId,
        isActive: true,
        endsAt: { gte: new Date() },
      },
    });

    if (!selectedSlot || selectedSlot.reservedCount >= selectedSlot.capacity) {
      return { error: "El horario seleccionado ya no esta disponible. Elige otro slot." };
    }

    const request = await prisma.$transaction(async (tx) => {
      const createdRequest = await tx.customPageRequest.create({
        data: {
          tenantId: membership.tenantId,
          requesterUserId: verifiedSession.user.id,
          requestType: "TEMPLATE_CUSTOMIZATION",
          businessObjective: parsed.data.businessObjective,
          pageScope: parsed.data.pageScope,
          businessDescription: parsed.data.businessDescription,
          desiredColors: parsed.data.desiredColors,
          brandStyle: parsed.data.brandStyle,
          desiredFeatures: parsed.data.desiredFeatures,
          visualReferences: parsed.data.visualReferences ?? null,
          designReferences: parsed.data.designReferences ?? null,
          requiredIntegrations: parsed.data.requiredIntegrations ?? null,
          observations: parsed.data.observations ?? null,
          notes: parsed.data.notes ?? null,
          referenceFiles: storedFiles.length > 0 ? storedFiles : undefined,
          premiumRequested: true,
          status: "SUBMITTED",
        },
      });

      const meeting = await tx.customProjectMeeting.upsert({
        where: {
          customPageRequestId_type: {
            customPageRequestId: createdRequest.id,
            type: "DEFINITION",
          },
        },
        update: {
          isEnabledByAdmin: true,
          status: "CONFIRMED",
          requestedAt: new Date(),
          requestedByUserId: verifiedSession.user.id,
          requestedDate: selectedSlot.startsAt,
          confirmedDate: selectedSlot.startsAt,
          scheduledStart: selectedSlot.startsAt,
          scheduledEnd: selectedSlot.endsAt,
        },
        create: {
          tenantId: membership.tenantId,
          customPageRequestId: createdRequest.id,
          type: "DEFINITION",
          isEnabledByAdmin: true,
          status: "CONFIRMED",
          requestedAt: new Date(),
          requestedByUserId: verifiedSession.user.id,
          requestedDate: selectedSlot.startsAt,
          confirmedDate: selectedSlot.startsAt,
          scheduledStart: selectedSlot.startsAt,
          scheduledEnd: selectedSlot.endsAt,
        },
      });

      const booking = await tx.customProjectMeetingBooking.create({
        data: {
          tenantId: membership.tenantId,
          customPageRequestId: createdRequest.id,
          customMeetingId: meeting.id,
          slotId: selectedSlot.id,
          bookedByUserId: verifiedSession.user.id,
          scheduledStart: selectedSlot.startsAt,
          scheduledEnd: selectedSlot.endsAt,
          meetingUrl: meeting.meetingUrl ?? undefined,
        },
      });

      await tx.meetingAvailabilitySlot.update({
        where: { id: selectedSlot.id },
        data: { reservedCount: { increment: 1 } },
      });

      return { createdRequest, booking };
    });

    await createAuditLog({
      action: "business.custom_page_requested",
      targetType: "custom_page_request",
      targetId: request.createdRequest.id,
      tenantId: membership.tenantId,
      actorUserId: verifiedSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        slotId: parsed.data.slotId,
        bookingId: request.booking.id,
        attachments: storedFiles.length,
      },
    });

    await createAutoAdminNotification({
      title: "Nuevo pedido de personalización",
      message: `El tenant ${membership.tenant.name} solicitó una página personalizada para "${parsed.data.pageScope}".`,
      category: "business",
      tone: "info",
      targetRole: "SUPER_ADMIN",
      tenantId: membership.tenantId,
    });

    revalidatePath("/app/business");
    revalidatePath("/app");
    revalidatePath("/app/owner/customizations");
    return {
      success:
        "Recibimos tu solicitud y reservamos la reunion de definicion. Veras recordatorios dentro del panel.",
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FILE_TOO_LARGE") return { error: "Uno de los archivos supera el tamano permitido." };
      if (error.message === "FILE_EXTENSION_NOT_ALLOWED" || error.message === "FILE_TYPE_NOT_ALLOWED") {
        return { error: "Solo se aceptan imagenes PNG, JPG, WEBP o PDF como referencia." };
      }
      if (error.message === "FILE_SIGNATURE_INVALID") return { error: "Uno de los archivos no parece valido. Revisa el formato y vuelve a intentar." };
      if (error.message === "UNAUTHENTICATED") return { error: "Tu sesion expiro. Vuelve a iniciar sesion para enviar la solicitud." };
      if (error.message === "FORBIDDEN") return { error: "Tu cuenta no tiene permiso para solicitar proyectos personalizados en este workspace." };
    }

    return { error: "No pudimos enviar la solicitud. Revisa los datos e intenta de nuevo." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { AuthActionState } from "@/app/(auth)/actions";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { createInitialBuilderDocument } from "@/lib/business/builder";
import { calculateTemporaryLifecycle } from "@/lib/business/lifecycle";
import { canCreateStorefrontPage, getEffectivePlan, getPlanLimits } from "@/lib/business/plans";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { validateUpload } from "@/lib/security/upload";
import { saveLocalUpload } from "@/lib/storage/local-upload";
import {
  createStorefrontPageSchema,
  deleteStorefrontPagesSchema,
  requestCustomDomainSchema,
  requestCustomPageSchema,
} from "@/lib/validators/business";
import { respondCustomizationQuoteSchema } from "@/lib/validators/custom-quotes";
import { createAuditLog } from "@/server/services/audit-log";

type CustomProjectMeetingTypeInput =
  | "DEFINITION"
  | "DESIGN"
  | "MID_DEVELOPMENT"
  | "FINAL_DELIVERY"
  | "FOLLOW_UP";

const customProjectMeetingTypes = new Set<CustomProjectMeetingTypeInput>([
  "DEFINITION",
  "DESIGN",
  "MID_DEVELOPMENT",
  "FINAL_DELIVERY",
  "FOLLOW_UP",
]);

function validationErrorState(error: Record<string, string[]>) {
  return {
    error: "Revisa los campos marcados y vuelve a intentar.",
    fieldErrors: error,
  } satisfies AuthActionState;
}

export async function createStorefrontPageAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.OWNER);
  const parsed = createStorefrontPageSchema.safeParse({
    name: sanitizeText(String(formData.get("name") ?? "")),
    description: sanitizeNullableText(String(formData.get("description") ?? "")),
    pageMode: formData.get("pageMode"),
  });

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId: membership.tenantId },
  });
  const currentPages = await prisma.storefrontPage.findMany({
    where: { tenantId: membership.tenantId },
    select: { status: true },
  });
  const effectivePlan = getEffectivePlan(subscription);
  const limits = getPlanLimits(effectivePlan);
  const activePagesCount = currentPages.filter((page) => page.status !== "ARCHIVED").length;
  const effectiveProjectLimit = Math.max(1, Math.min(limits.maxPages, effectivePlan.businessProjectLimit || 1));

  if (!canCreateStorefrontPage(currentPages, effectivePlan) || activePagesCount >= effectiveProjectLimit) {
    return {
      error: `Tu plan actual permite hasta ${effectiveProjectLimit} proyecto(s) Business activo(s).`,
    };
  }

  const isTemporary = parsed.data.pageMode === "TEMPORARY";
  const templateKey = isTemporary ? "STARTER" : "CATALOG";

  if (isTemporary && !effectivePlan.temporaryPagesEnabled) {
    return {
      error: "Tu plan actual no permite paginas temporales.",
    };
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const lifecycle = isTemporary ? calculateTemporaryLifecycle() : null;
  const builderDocument = createInitialBuilderDocument(templateKey);

  try {
    await prisma.$transaction(async (tx) => {
      const page = await tx.storefrontPage.create({
        data: {
          tenantId: membership.tenantId,
          createdByUserId: verifiedSession.user.id,
          name: parsed.data.name,
          slug,
          description: parsed.data.description,
          templateKey,
          builderDocument,
          builderLastSavedAt: new Date(),
          status: isTemporary ? "TEMPORARY" : "ACTIVE",
          isTemporary,
          expiresAt: lifecycle?.expiresAt,
          graceEndsAt: lifecycle?.graceEndsAt,
          publishedAt: new Date(),
        },
      });

      await tx.storefrontPageVersion.create({
        data: {
          storefrontPageId: page.id,
          createdByUserId: verifiedSession.user.id,
          versionNumber: 1,
          kind: "MANUAL",
          changeSummary: "Version inicial generada desde la plantilla base.",
          snapshot: builderDocument,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Ya existe una pagina con un nombre muy parecido. Elige otro nombre.",
      };
    }

    return {
      error: "No pudimos crear la pagina en este momento.",
    };
  }

  await createAuditLog({
    action: "business.page_created",
    targetType: "storefront_page",
    tenantId: membership.tenantId,
    actorUserId: verifiedSession.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      slug,
      temporary: isTemporary,
    },
  });

  revalidatePath("/app/owner");
  return {
    success: isTemporary
      ? "Pagina temporal creada. Tendras 30 dias de actividad y 7 dias de gracia."
      : "Pagina creada correctamente.",
  };
}

export async function deleteStorefrontPagesAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.OWNER);

  await enforceRateLimit({
    scope: "business:page-delete",
    key: `${requestContext.ipAddress}:${membership.tenantId}:${verifiedSession.user.id}`,
    limit: 20,
    windowSeconds: 60 * 30,
  });

  const parsed = deleteStorefrontPagesSchema.safeParse({
    pageIds: formData.getAll("pageIds"),
  });

  if (!parsed.success) {
    return {
      error: "Selecciona al menos una pagina valida para eliminar.",
    };
  }

  const uniquePageIds = [...new Set(parsed.data.pageIds)];
  const pages = await prisma.storefrontPage.findMany({
    where: {
      tenantId: membership.tenantId,
      id: { in: uniquePageIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (pages.length === 0) {
    return {
      error: "No encontramos las paginas seleccionadas dentro de este tenant.",
    };
  }

  await prisma.storefrontPage.deleteMany({
    where: {
      tenantId: membership.tenantId,
      id: { in: pages.map((page) => page.id) },
    },
  });

  await createAuditLog({
    action: "business.pages_deleted",
    targetType: "storefront_page",
    tenantId: membership.tenantId,
    actorUserId: verifiedSession.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      deletedCount: pages.length,
      pageIds: pages.map((page) => page.id),
      pageNames: pages.map((page) => page.name),
    },
  });

  revalidatePath("/app/owner");
  return {
    success:
      pages.length === 1
        ? "Pagina eliminada correctamente."
        : `${pages.length} paginas eliminadas correctamente.`,
  };
}

export async function requestCustomPageAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.OWNER);
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

  revalidatePath("/app/business");
  revalidatePath("/app");
  revalidatePath("/app/owner/customizations");
  return {
    success:
      "Recibimos tu solicitud y reservamos la reunion de definicion. Veras recordatorios dentro del panel.",
  };
}

export async function respondToCustomizationQuoteAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.OWNER);

  await enforceRateLimit({
    scope: "business:quote-response",
    key: `${requestContext.ipAddress}:${membership.tenantId}:${verifiedSession.user.id}`,
    limit: 20,
    windowSeconds: 60 * 30,
  });

  const parsed = respondCustomizationQuoteSchema.safeParse({
    quoteId: formData.get("quoteId"),
    decision: formData.get("decision"),
    responseMessage: sanitizeNullableText(String(formData.get("responseMessage") ?? "")),
  });

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const quote = await prisma.customQuote.findFirst({
    where: {
      id: parsed.data.quoteId,
      tenantId: membership.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      status: true,
      customPageRequestId: true,
    },
  });

  if (!quote) {
    return {
      error: "No encontramos el presupuesto asociado a tu cuenta.",
    };
  }

  if (quote.status !== "PENDING_CLIENT") {
    return {
      error: "Este presupuesto ya no esta disponible para una nueva respuesta.",
    };
  }

  const accepted = parsed.data.decision === "ACCEPT";

  await prisma.$transaction(async (tx) => {
    await tx.customQuote.update({
      where: { id: quote.id },
      data: {
        status: accepted ? "ACCEPTED" : "REJECTED",
        clientResponseMessage: parsed.data.responseMessage ?? null,
        clientRespondedAt: new Date(),
        acceptedAt: accepted ? new Date() : null,
        rejectedAt: accepted ? null : new Date(),
      },
    });

    await tx.customPageRequest.update({
      where: { id: quote.customPageRequestId },
      data: {
        status: accepted ? "IN_PROGRESS" : "REVIEWING",
        reviewNotes: parsed.data.responseMessage ?? undefined,
        reviewedAt: new Date(),
        reviewedByUserId: verifiedSession.user.id,
      },
    });

    await tx.customQuoteRevision.create({
      data: {
        quoteId: quote.id,
        changedByUserId: verifiedSession.user.id,
        revisionType: accepted ? "ACCEPTED_BY_CLIENT" : "REJECTED_BY_CLIENT",
        summary: accepted
          ? "Cliente acepto el presupuesto y habilito inicio de trabajo."
          : "Cliente rechazo el presupuesto y solicito nueva revision.",
        snapshot: {
          decision: parsed.data.decision,
          responseMessage: parsed.data.responseMessage ?? null,
          respondedAt: new Date().toISOString(),
        },
      },
    });
  });

  await createAuditLog({
    action: accepted ? "business.custom_quote_accepted" : "business.custom_quote_rejected",
    targetType: "custom_quote",
    targetId: quote.id,
    tenantId: membership.tenantId,
    actorUserId: verifiedSession.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      responseMessage: parsed.data.responseMessage ?? null,
    },
  });

  revalidatePath("/app/owner");
  revalidatePath("/app/owner/customizations");
  revalidatePath("/app/admin");
  revalidatePath("/app/admin/customizations");
  return {
    success: accepted
      ? "Presupuesto aceptado. El equipo Vase ya puede avanzar con tu proyecto."
      : "Presupuesto rechazado. El equipo Vase revisara tu feedback.",
  };
}

export async function requestDomainConnectionAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.OWNER);
  const parsed = requestCustomDomainSchema.safeParse({
    hostname: formData.get("hostname"),
    storefrontPageId: formData.get("storefrontPageId"),
  });

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId: membership.tenantId },
  });
  const effectivePlan = getEffectivePlan(subscription);

  if (!getPlanLimits(effectivePlan).canUseCustomDomain) {
    return {
      error: "Tu plan actual necesita premium para conectar un dominio propio.",
    };
  }

  let storefrontPageId: string | null = null;

  if (parsed.data.storefrontPageId) {
    const page = await prisma.storefrontPage.findFirst({
      where: {
        id: parsed.data.storefrontPageId,
        tenantId: membership.tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!page) {
      return {
        error: "No encontramos el sitio que quieres vincular con este dominio.",
      };
    }

    storefrontPageId = page.id;
  }

  try {
    await prisma.domainConnection.create({
      data: {
        tenantId: membership.tenantId,
        storefrontPageId,
        hostname: parsed.data.hostname,
        status: "PENDING_VERIFICATION",
        requiresPaidPlan: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Ese dominio ya fue registrado dentro de tu tenant.",
      };
    }

    return {
      error: "No pudimos registrar el dominio ahora mismo.",
    };
  }

  await createAuditLog({
    action: "business.domain_requested",
    targetType: "domain_connection",
    tenantId: membership.tenantId,
    actorUserId: verifiedSession.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      hostname: parsed.data.hostname,
      storefrontPageId,
    },
  });

  revalidatePath("/app/owner");
  return {
    success: "Dominio enviado. Te mostraremos el estado de verificacion en el panel.",
  };
}

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
  const { membership } = await requireTenantRole(tenantRoles.OWNER);
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

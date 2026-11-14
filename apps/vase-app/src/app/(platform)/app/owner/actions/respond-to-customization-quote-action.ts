"use server";

// Parte de actions.ts: respondToCustomizationQuoteAction, requestDomainConnectionAction.
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { type AuthActionState } from "@/app/(auth)/actions";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { getEffectivePlan, getPlanLimits } from "@/lib/business/plans";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { requestCustomDomainSchema } from "@/lib/validators/business";
import { respondCustomizationQuoteSchema } from "@/lib/validators/custom-quotes";
import { createAuditLog } from "@/server/services/audit-log";
import { ensureProjectCreatedFromAcceptedQuote, validationErrorState } from "./ensure-project-created-from-accepted-quote";

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
      customPageRequest: {
        select: {
          pageScope: true,
        },
      },
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

  let createdProjectId: string | null = null;
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

    if (accepted) {
      const businessModule = await tx.module.findFirst({
        where: { product: "BUSINESS", isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      createdProjectId = await ensureProjectCreatedFromAcceptedQuote({
        tx,
        tenantId: membership.tenantId,
        customPageRequestId: quote.customPageRequestId,
        actorUserId: verifiedSession.user.id,
        moduleId: businessModule?.id ?? null,
        projectNameSeed: quote.customPageRequest.pageScope,
      });
    }
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
      createdProjectId,
    },
  });

  revalidatePath("/app/owner");
  revalidatePath("/app/owner/customizations");
  revalidatePath("/app/admin");
  revalidatePath("/app/admin/customizations");
  return {
    success: accepted
      ? "Presupuesto aceptado. Creamos el proyecto y sus procesos base automaticamente."
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

  revalidatePath("/app/owner", "layout");
  revalidatePath("/app/business");
  return {
    success: "Dominio enviado. Te mostraremos el estado de verificacion en el panel.",
  };
}

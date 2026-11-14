"use server";

// Mover un pedido de personalización de etapa.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { formatMoneyFromCents } from "@/lib/business/custom-quotes";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState, CustomizationPipelineTarget, customizationPipelineTargets, ensureProjectCreatedFromAcceptedQuote } from "./shared";

export async function moveCustomizationPipelineStageAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const requestId = String(formData.get("requestId") ?? "");
    const targetStage = String(formData.get("targetStage") ?? "") as CustomizationPipelineTarget;

    if (!requestId || !customizationPipelineTargets.has(targetStage)) {
      return { error: "No pudimos interpretar la etapa seleccionada." };
    }

    const request = await prisma.customPageRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        tenantId: true,
        pageScope: true,
        quote: {
          select: {
            id: true,
            status: true,
            totalAmountCents: true,
            currency: true,
          },
        },
      },
    });

    if (!request) {
      return { error: "La solicitud ya no existe." };
    }

    const now = new Date();
    let createdProjectId: string | null = null;
    await prisma.$transaction(async (tx) => {
      if (targetStage === "REQUESTS") {
        await tx.customPageRequest.update({
          where: { id: request.id },
          data: {
            status: "SUBMITTED",
            reviewedAt: now,
            reviewedByUserId: adminSession.user.id,
          },
        });
        if (request.quote) {
          await tx.customQuote.update({
            where: { id: request.quote.id },
            data: {
              status: "DRAFT",
              sentAt: null,
              acceptedAt: null,
              rejectedAt: null,
              clientRespondedAt: null,
              clientResponseMessage: null,
              updatedByUserId: adminSession.user.id,
            },
          });
          await tx.customQuoteRevision.create({
            data: {
              quoteId: request.quote.id,
              changedByUserId: adminSession.user.id,
              revisionType: "UPDATED",
              summary: "Solicitud movida a pedido inicial por Super Admin.",
              snapshot: {
                status: "DRAFT",
                movedAt: now.toISOString(),
                targetStage,
              },
            },
          });
        }
        return;
      }

      if (targetStage === "WITHOUT_QUOTE") {
        await tx.customPageRequest.update({
          where: { id: request.id },
          data: {
            status: "REVIEWING",
            reviewedAt: now,
            reviewedByUserId: adminSession.user.id,
          },
        });

        if (request.quote) {
          await tx.customQuote.update({
            where: { id: request.quote.id },
            data: {
              status: "DRAFT",
              sentAt: null,
              acceptedAt: null,
              rejectedAt: null,
              clientRespondedAt: null,
              clientResponseMessage: null,
              updatedByUserId: adminSession.user.id,
            },
          });
          await tx.customQuoteRevision.create({
            data: {
              quoteId: request.quote.id,
              changedByUserId: adminSession.user.id,
              revisionType: "UPDATED",
              summary: "Solicitud movida a sin presupuesto por Super Admin.",
              snapshot: {
                status: "DRAFT",
                movedAt: now.toISOString(),
                targetStage,
              },
            },
          });
        }
        return;
      }

      if (!request.quote) {
        throw new Error("CUSTOM_PIPELINE_QUOTE_REQUIRED");
      }

      if (targetStage === "PENDING_CLIENT") {
        await tx.customQuote.update({
          where: { id: request.quote.id },
          data: {
            status: "PENDING_CLIENT",
            sentAt: now,
            acceptedAt: null,
            rejectedAt: null,
            clientRespondedAt: null,
            clientResponseMessage: null,
            updatedByUserId: adminSession.user.id,
          },
        });
        await tx.customPageRequest.update({
          where: { id: request.id },
          data: {
            status: "QUOTED",
            quotedPriceLabel: formatMoneyFromCents(request.quote.totalAmountCents, request.quote.currency),
            reviewedAt: now,
            reviewedByUserId: adminSession.user.id,
          },
        });
        await tx.customQuoteRevision.create({
          data: {
            quoteId: request.quote.id,
            changedByUserId: adminSession.user.id,
            revisionType: "SENT_TO_CLIENT",
            summary: "Presupuesto movido a pendiente del cliente por Super Admin.",
            snapshot: {
              status: "PENDING_CLIENT",
              movedAt: now.toISOString(),
              targetStage,
            },
          },
        });
        return;
      }

      await tx.customQuote.update({
        where: { id: request.quote.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
          rejectedAt: null,
          clientRespondedAt: now,
          updatedByUserId: adminSession.user.id,
        },
      });
      await tx.customPageRequest.update({
        where: { id: request.id },
        data: {
          status: "IN_PROGRESS",
          quotedPriceLabel: formatMoneyFromCents(request.quote.totalAmountCents, request.quote.currency),
          reviewedAt: now,
          reviewedByUserId: adminSession.user.id,
        },
      });
      await tx.customQuoteRevision.create({
        data: {
          quoteId: request.quote.id,
          changedByUserId: adminSession.user.id,
          revisionType: "ACCEPTED_BY_CLIENT",
          summary: "Presupuesto marcado como aceptado por Super Admin.",
          snapshot: {
            status: "ACCEPTED",
            movedAt: now.toISOString(),
            targetStage,
          },
        },
      });

      const businessModule = await tx.module.findFirst({
        where: { product: "BUSINESS", isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      createdProjectId = await ensureProjectCreatedFromAcceptedQuote({
        tx,
        tenantId: request.tenantId,
        customPageRequestId: request.id,
        actorUserId: adminSession.user.id,
        moduleId: businessModule?.id ?? null,
        projectNameSeed: request.pageScope,
      });
    });

    await createAuditLog({
      action: "platform.custom_request_pipeline_moved",
      targetType: "custom_page_request",
      targetId: request.id,
      tenantId: request.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { targetStage, createdProjectId },
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner");
    revalidatePath("/app/owner/customizations");
    if (targetStage === "ACCEPTED") {
      return { success: "Solicitud aceptada. Proyecto y procesos base creados automaticamente." };
    }
    return { success: "Solicitud movida de etapa." };
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOM_PIPELINE_QUOTE_REQUIRED") {
      return { error: "Primero tenes que crear un presupuesto para moverlo a esa etapa." };
    }
    return { error: "No pudimos mover la solicitud." };
  }
}

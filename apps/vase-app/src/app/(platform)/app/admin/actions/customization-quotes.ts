"use server";

// Presupuestos de personalización: armar y enviar.
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { buildQuoteLineItems, buildQuoteSnapshot, calculateQuoteTotals, formatMoneyFromCents } from "@/lib/business/custom-quotes";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { sendCustomizationQuoteSchema, upsertCustomizationQuoteSchema } from "@/lib/validators/custom-quotes";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState, toNullableDate } from "./shared";

export async function upsertCustomizationQuoteAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = upsertCustomizationQuoteSchema.safeParse({
      requestId: formData.get("requestId"),
      templateKey: formData.get("templateKey"),
      currency: formData.get("currency"),
      baseTemplateAmountUnits: formData.get("baseTemplateAmountUnits"),
      featureExtraAmountUnits: formData.get("featureExtraAmountUnits"),
      designExtraAmountUnits: formData.get("designExtraAmountUnits"),
      integrationExtraAmountUnits: formData.get("integrationExtraAmountUnits"),
      serviceExtraAmountUnits: formData.get("serviceExtraAmountUnits"),
      estimatedDeliveryDays: formData.get("estimatedDeliveryDays"),
      validUntil: formData.get("validUntil"),
      clientSummary: sanitizeText(String(formData.get("clientSummary") ?? "")),
      internalSummary: sanitizeNullableText(String(formData.get("internalSummary") ?? "")),
      observations: sanitizeNullableText(String(formData.get("observations") ?? "")),
    });

    if (!parsed.success) {
      return { error: "Revisa importes, vigencia, resumen comercial y tiempos antes de guardar." };
    }

    const request = await prisma.customPageRequest.findUnique({
      where: { id: parsed.data.requestId },
      select: {
        id: true,
        tenantId: true,
        quote: {
          select: { id: true, quoteNumber: true },
        },
      },
    });

    if (!request) {
      return { error: "La solicitud que intentas cotizar ya no existe." };
    }

    const lineItems = buildQuoteLineItems(parsed.data);
    const totals = calculateQuoteTotals(lineItems);
    const validUntil = toNullableDate(parsed.data.validUntil);
    const snapshot = buildQuoteSnapshot({
      templateKey: parsed.data.templateKey,
      currency: parsed.data.currency,
      estimatedDeliveryDays: parsed.data.estimatedDeliveryDays,
      validUntil,
      clientSummary: parsed.data.clientSummary,
      internalSummary: parsed.data.internalSummary ?? null,
      observations: parsed.data.observations ?? null,
      lineItems,
      totals,
    });

    const quote = await prisma.$transaction(async (tx) => {
      const savedQuote = await tx.customQuote.upsert({
        where: { customPageRequestId: request.id },
        update: {
          templateKey: parsed.data.templateKey,
          currency: parsed.data.currency,
          baseAmountCents: totals.baseAmountCents,
          extrasAmountCents: totals.extrasAmountCents,
          totalAmountCents: totals.totalAmountCents,
          estimatedDeliveryDays: parsed.data.estimatedDeliveryDays,
          validUntil,
          clientSummary: parsed.data.clientSummary,
          internalSummary: parsed.data.internalSummary ?? null,
          observations: parsed.data.observations ?? null,
          updatedByUserId: adminSession.user.id,
          lineItems: {
            deleteMany: {},
            create: lineItems.map((line) => ({
              lineType: line.lineType,
              label: line.label,
              description: line.description,
              quantity: line.quantity,
              unitAmountCents: line.unitAmountCents,
              totalAmountCents: line.totalAmountCents,
              sortOrder: line.sortOrder,
            })),
          },
        },
        create: {
          tenantId: request.tenantId,
          customPageRequestId: request.id,
          createdByUserId: adminSession.user.id,
          updatedByUserId: adminSession.user.id,
          quoteNumber: `VQ-${randomUUID().slice(0, 8).toUpperCase()}`,
          templateKey: parsed.data.templateKey,
          currency: parsed.data.currency,
          baseAmountCents: totals.baseAmountCents,
          extrasAmountCents: totals.extrasAmountCents,
          totalAmountCents: totals.totalAmountCents,
          estimatedDeliveryDays: parsed.data.estimatedDeliveryDays,
          validUntil,
          clientSummary: parsed.data.clientSummary,
          internalSummary: parsed.data.internalSummary ?? null,
          observations: parsed.data.observations ?? null,
          lineItems: {
            create: lineItems.map((line) => ({
              lineType: line.lineType,
              label: line.label,
              description: line.description,
              quantity: line.quantity,
              unitAmountCents: line.unitAmountCents,
              totalAmountCents: line.totalAmountCents,
              sortOrder: line.sortOrder,
            })),
          },
        },
      });

      await tx.customPageRequest.update({
        where: { id: request.id },
        data: {
          status: "REVIEWING",
          quotedPriceLabel: formatMoneyFromCents(totals.totalAmountCents, parsed.data.currency),
          reviewNotes: parsed.data.internalSummary ?? parsed.data.observations ?? null,
          reviewedAt: new Date(),
          reviewedByUserId: adminSession.user.id,
        },
      });

      await tx.customQuoteRevision.create({
        data: {
          quoteId: savedQuote.id,
          changedByUserId: adminSession.user.id,
          revisionType: request.quote ? "UPDATED" : "CREATED",
          summary: request.quote
            ? "Presupuesto actualizado con nuevo alcance, extras o tiempos."
            : "Presupuesto inicial generado desde la solicitud del cliente.",
          snapshot,
        },
      });

      return savedQuote;
    });

    await createAuditLog({
      action: "platform.custom_quote_upserted",
      targetType: "custom_quote",
      targetId: quote.id,
      tenantId: request.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        totalAmountCents: totals.totalAmountCents,
        currency: parsed.data.currency,
        templateKey: parsed.data.templateKey,
      },
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner");
    revalidatePath("/app/owner/customizations");
    return { success: "Presupuesto guardado correctamente." };
  } catch {
    return { error: "No pudimos guardar el presupuesto en este momento." };
  }
}

export async function sendCustomizationQuoteAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = sendCustomizationQuoteSchema.safeParse({
      quoteId: formData.get("quoteId"),
    });

    if (!parsed.success) {
      return { error: "No pudimos interpretar el presupuesto a enviar." };
    }

    const quote = await prisma.customQuote.findUnique({
      where: { id: parsed.data.quoteId },
      select: {
        id: true,
        tenantId: true,
        totalAmountCents: true,
        currency: true,
        customPageRequestId: true,
      },
    });

    if (!quote) {
      return { error: "El presupuesto ya no existe." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.customQuote.update({
        where: { id: quote.id },
        data: {
          status: "PENDING_CLIENT",
          sentAt: new Date(),
          updatedByUserId: adminSession.user.id,
        },
      });

      await tx.customPageRequest.update({
        where: { id: quote.customPageRequestId },
        data: {
          status: "QUOTED",
          quotedPriceLabel: formatMoneyFromCents(quote.totalAmountCents, quote.currency),
          reviewedAt: new Date(),
          reviewedByUserId: adminSession.user.id,
        },
      });

      await tx.customQuoteRevision.create({
        data: {
          quoteId: quote.id,
          changedByUserId: adminSession.user.id,
          revisionType: "SENT_TO_CLIENT",
          summary: "Presupuesto enviado al cliente para revisiÃ³n y decisiÃ³n.",
          snapshot: {
            status: "PENDING_CLIENT",
            sentAt: new Date().toISOString(),
          },
        },
      });
    });

    await createAuditLog({
      action: "platform.custom_quote_sent",
      targetType: "custom_quote",
      targetId: quote.id,
      tenantId: quote.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner");
    revalidatePath("/app/owner/customizations");
    return { success: "Presupuesto enviado al cliente." };
  } catch {
    return { error: "No pudimos enviar el presupuesto." };
  }
}

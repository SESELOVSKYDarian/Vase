"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireVerifiedPlatformRole, requireVerifiedUser, platformRoles } from "@/lib/auth/guards";
import {
  buildQuoteLineItems,
  buildQuoteSnapshot,
  calculateQuoteTotals,
  formatMoneyFromCents,
} from "@/lib/business/custom-quotes";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import {
  createSupportUserSchema,
  createAdminModuleSchema,
  toggleFeatureFlagSchema,
  updateAdminModulePricingSchema,
  updateAdminModuleSchema,
  updateSupportTemplateAdminSchema,
  updateTenantGovernanceSchema,
  updateUserGovernanceSchema,
  createPlatformUpdateSchema,
  deletePlatformUpdateSchema,
} from "@/lib/validators/admin";
import { reviewCustomizationRequestSchema } from "@/lib/validators/builder";
import {
  sendCustomizationQuoteSchema,
  upsertCustomizationQuoteSchema,
} from "@/lib/validators/custom-quotes";
import { createAuditLog } from "@/server/services/audit-log";
import { ensureModuleCatalogSynced, normalizePricingType } from "@/server/services/modules";

export type AdminReviewActionState = {
  success?: string;
  error?: string;
};

export type AdminGovernanceActionState = {
  success?: string;
  error?: string;
};

function toNullableDate(value: string) {
  return value ? new Date(value) : null;
}

export async function reviewCustomizationRequestAction(
  _: AdminReviewActionState,
  formData: FormData,
): Promise<AdminReviewActionState> {
  try {
    const requestContext = await getRequestContext();
    const verifiedSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = reviewCustomizationRequestSchema.safeParse({
      requestId: formData.get("requestId"),
      status: formData.get("status"),
      quotedPriceLabel: formData.get("quotedPriceLabel"),
      reviewNotes: formData.get("reviewNotes"),
    });

    if (!parsed.success) {
      return {
        error: "Revisa estado, cotizacion y notas antes de guardar.",
      };
    }

    const request = await prisma.customPageRequest.findUnique({
      where: { id: parsed.data.requestId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!request) {
      return {
        error: "La solicitud ya no existe.",
      };
    }

    await prisma.customPageRequest.update({
      where: { id: request.id },
      data: {
        status: parsed.data.status,
        quotedPriceLabel: sanitizeNullableText(parsed.data.quotedPriceLabel),
        reviewNotes: sanitizeNullableText(parsed.data.reviewNotes),
        reviewedAt: new Date(),
        reviewedByUserId: verifiedSession.user.id,
      },
    });

    await createAuditLog({
      action: "platform.custom_page_request_reviewed",
      targetType: "custom_page_request",
      targetId: request.id,
      tenantId: request.tenantId,
      actorUserId: verifiedSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        status: parsed.data.status,
      },
    });

    revalidatePath("/app/admin");
    return {
      success: "Solicitud actualizada correctamente.",
    };
  } catch {
    return {
      error: "No pudimos guardar la revision administrativa.",
    };
  }
}

export async function createSupportUserAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createSupportUserSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      platformRole: formData.get("platformRole"),
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, email, password y rol antes de crear el usuario." };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existing) {
      return { error: "Ya existe un usuario con ese email." };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        platformRole: parsed.data.platformRole,
        locale: "es",
      },
    });

    await createAuditLog({
      action: "platform.support_user_created",
      targetType: "user",
      targetId: user.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        platformRole: parsed.data.platformRole,
      },
    });

    revalidatePath("/app/admin");
    return { success: "Usuario interno creado correctamente." };
  } catch {
    return { error: "No pudimos crear el usuario interno." };
  }
}

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

export async function updateSupportReplyTemplateAdminAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateSupportTemplateAdminSchema.safeParse({
      templateId: formData.get("templateId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      body: sanitizeText(String(formData.get("body") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, categoria, cuerpo y estado del template." };
    }

    const template = await prisma.supportReplyTemplate.update({
      where: { id: parsed.data.templateId },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        body: parsed.data.body,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.support_template_updated",
      targetType: "support_reply_template",
      targetId: template.id,
      tenantId: template.tenantId ?? undefined,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/support");
    return { success: "Respuesta base actualizada." };
  } catch {
    return { error: "No pudimos actualizar la respuesta base." };
  }
}

export async function createAdminModuleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createAdminModuleSchema.safeParse({
      id: sanitizeText(String(formData.get("id") ?? "")),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      product: formData.get("product"),
      route: sanitizeText(String(formData.get("route") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa id, nombre, descripcion, producto y ruta del modulo." };
    }

    await ensureModuleCatalogSynced();

    const createdModule = await prisma.module.create({
      data: {
        id: parsed.data.id,
        name: parsed.data.name,
        description: parsed.data.description,
        product: parsed.data.product,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.module_created",
      targetType: "module",
      targetId: createdModule.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        product: createdModule.product,
        route: createdModule.route,
      },
    });

    revalidatePath("/app/admin/modules");
    revalidatePath("/app/admin");
    return { success: "Modulo creado correctamente." };
  } catch {
    return { error: "No pudimos crear el modulo." };
  }
}

export async function updateAdminModuleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateAdminModuleSchema.safeParse({
      moduleId: formData.get("moduleId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      route: sanitizeText(String(formData.get("route") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, descripcion, ruta y estado del modulo." };
    }

    const updatedModule = await prisma.module.update({
      where: { id: parsed.data.moduleId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.module_updated",
      targetType: "module",
      targetId: updatedModule.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        isActive: updatedModule.isActive,
        route: updatedModule.route,
      },
    });

    revalidatePath("/app/admin/modules");
    revalidatePath("/app/admin");
    return { success: "Modulo actualizado." };
  } catch {
    return { error: "No pudimos actualizar el modulo." };
  }
}

export async function updateAdminModulePricingAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateAdminModulePricingSchema.safeParse({
      moduleId: formData.get("moduleId"),
      price: formData.get("price"),
      currency: sanitizeText(String(formData.get("currency") ?? "")),
      type: formData.get("type"),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa precio, moneda, tipo y estado del pricing." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.modulePricing.updateMany({
        where: {
          moduleId: parsed.data.moduleId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      await tx.modulePricing.create({
        data: {
          moduleId: parsed.data.moduleId,
          price: parsed.data.price,
          currency: parsed.data.currency,
          type: normalizePricingType(parsed.data.type),
          isActive: parsed.data.isActive,
        },
      });
    });

    await createAuditLog({
      action: "platform.module_pricing_updated",
      targetType: "module_pricing",
      targetId: parsed.data.moduleId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        price: parsed.data.price,
        currency: parsed.data.currency,
        type: parsed.data.type,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/app/admin/modules");
    revalidatePath("/app");
    return { success: "Pricing actualizado." };
  } catch {
    return { error: "No pudimos actualizar el pricing del modulo." };
  }
}

export async function updateUserGovernanceAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateUserGovernanceSchema.safeParse({
      userId: formData.get("userId"),
      platformRole: formData.get("platformRole"),
    });

    if (!parsed.success) {
      return { error: "Revisa el rol de plataforma antes de guardar." };
    }

    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        platformRole: parsed.data.platformRole,
      },
    });

    await createAuditLog({
      action: "platform.user_governance_updated",
      targetType: "user",
      targetId: user.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        platformRole: parsed.data.platformRole,
      },
    });

    revalidatePath("/app/admin");
    return { success: "Rol de usuario actualizado." };
  } catch {
    return { error: "No pudimos actualizar el usuario." };
  }
}

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
          summary: "Presupuesto enviado al cliente para revisión y decisión.",
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

export async function createPlatformUpdateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createPlatformUpdateSchema.safeParse({
      title: sanitizeText(String(formData.get("title") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      href: sanitizeNullableText(String(formData.get("href") ?? "")) ?? undefined,
      tone: formData.get("tone"),
      category: formData.get("category"),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa título, descripción, categoría y tono del anuncio." };
    }

    const update = await prisma.platformUpdate.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        href: parsed.data.href,
        tone: parsed.data.tone,
        category: parsed.data.category,
        isActive: parsed.data.isActive,
        publishedAt: new Date(),
      },
    });

    await createAuditLog({
      action: "platform.update_created",
      targetType: "platform_update",
      targetId: update.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        title: update.title,
        category: update.category,
      },
    });

    revalidatePath("/app/admin");
    revalidatePath("/app");
    return { success: "Anuncio de plataforma creado." };
  } catch {
    return { error: "No pudimos crear el anuncio." };
  }
}

export async function deletePlatformUpdateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = deletePlatformUpdateSchema.safeParse({
      updateId: formData.get("updateId"),
    });

    if (!parsed.success) {
      return { error: "ID de anuncio inválido." };
    }

    await prisma.platformUpdate.delete({
      where: { id: parsed.data.updateId },
    });

    await createAuditLog({
      action: "platform.update_deleted",
      targetType: "platform_update",
      targetId: parsed.data.updateId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin");
    revalidatePath("/app");
    return { success: "Anuncio de plataforma eliminado." };
  } catch {
    return { error: "No pudimos eliminar el anuncio." };
  }
}

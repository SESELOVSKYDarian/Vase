"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { requireVerifiedPlatformRole, requireVerifiedUser, platformRoles } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import {
  buildQuoteLineItems,
  buildQuoteSnapshot,
  calculateQuoteTotals,
  formatMoneyFromCents,
} from "@/lib/business/custom-quotes";
import { createInitialBuilderDocument } from "@/lib/business/builder";
import {
  normalizeCustomProjectSlug,
  resolveCustomProjectSlug,
} from "@/lib/business/custom-project";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import {
  createSupportUserSchema,
  createManualUserByAdminSchema,
  createDeveloperUserSchema,
  createAdminModuleSchema,
  deleteAdminModuleSchema,
  toggleFeatureFlagSchema,
  updateAdminModulePricingSchema,
  createModuleSubmoduleSchema,
  createModuleFeatureSchema,
  deleteModuleFeatureSchema,
  deleteModuleSubmoduleSchema,
  updateModuleFeatureSchema,
  updateModuleSubmoduleSchema,
  updateModuleSubmodulePricingSchema,
  setTenantModuleActivationSchema,
  setTenantSubmoduleActivationSchema,
  publishModuleArtifactSchema,
  upsertMasterUserSchema,
  deleteMasterUserSchema,
  createUserClientPaymentSchema,
  updateAdminModuleSchema,
  updateSupportTemplateAdminSchema,
  updateTenantGovernanceSchema,
  updateUserGovernanceSchema,
  upsertUserRolesSchema,
  updateUserTenantAccessSchema,
  updateUserTenantAccessSnapshotSchema,
  createPlatformUpdateSchema,
  deletePlatformUpdateSchema,
  updateUserStatusSchema,
  resetUserPasswordSchema,
  updateBillingSnapshotSchema,
  createAdminNotificationSchema,
  createWikiDocumentSchema,
  upsertFaqItemSchema,
  deleteFaqItemSchema,
  updateWikiDocumentMetaSchema,
  addWikiSectionSchema,
  addWikiStepSchema,
  addWikiDiscussionSchema,
  updateAdminAccessPolicySchema,
  updateInternalAvailabilitySchema,
  createDevTaskSchema,
  updateDevTaskSchema,
  addDevTaskCommentSchema,
  createClientAccountSchema,
  createClientPaymentSchema,
  createExpenseSchema,
  updateClientAccountSchema,
  deleteClientAccountSchema,
  updateClientPaymentSchema,
  deleteClientPaymentSchema,
  addPaymentPartialItemSchema,
  attachPaymentInvoiceSchema,
  updateExpenseSchema,
  deleteExpenseSchema,
  updatePartnerConfigSchema,
  updateFinancialSettingsSchema,
  updateBusinessPlanSettingsSchema,
  updateLabsPlanSettingsSchema,
  upsertTokenPlanSettingSchema,
  createMeetingAvailabilitySlotSchema,
  updateMeetingAvailabilitySlotSchema,
  setCustomMeetingLinkSchema,
  provisionCustomProjectSchema,
  rollbackCustomProjectDeploymentSchema,
  createProjectWithProcessesSchema,
} from "@/lib/validators/admin";
import { reviewCustomizationRequestSchema } from "@/lib/validators/builder";
import {
  sendCustomizationQuoteSchema,
  upsertCustomizationQuoteSchema,
} from "@/lib/validators/custom-quotes";
import { createAuditLog, emitAuditLogEvent, persistAuditLog } from "@/server/services/audit-log";
import { createAutoAdminNotification } from "@/server/services/admin-notifications-auto";
import { ensureModuleCatalogSynced, normalizePricingType } from "@/server/services/modules";
import { getBusinessFeatureScope, parseModuleFeatureDefault } from "@/server/services/module-features";
import {
  buildAdminCreatedUserVerification,
  buildLabsWorkspaceProvisioning,
  getRoleMappingFromUiRole,
  shouldForceAdminCreatedUserPasswordReset,
  userAccessModuleIds,
} from "@/lib/admin/user-access";
import {
  buildClientProductAccessAuditChange,
  clientProductAccessEnvelopeSchema,
  parseStoredClientProductAccess,
  type ClientProductAccess,
} from "@/lib/admin/client-product-access";
import {
  adaptLegacyClientProductAccessWithTx,
  applyClientProductAccess,
} from "@/server/services/client-product-access";
import { validateUpload } from "@/lib/security/upload";
import { saveLocalUpload } from "@/lib/storage/local-upload";
import {
  createCustomStaticSiteManifest,
  downloadGithubRepositoryZip,
  extractCustomSitePackage,
  rollbackCustomSitePackage,
  type CustomSitePackageSource,
} from "@/server/services/custom-site-packages";

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

export type AdminReviewActionState = {
  success?: string;
  error?: string;
};

export type AdminGovernanceActionState = {
  success?: string;
  error?: string;
  durationMs?: number;
  publicUrl?: string;
  sourceType?: CustomSitePackageSource;
  deletedSlotId?: string;
  createdSlot?: {
    id: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    reservedCount: number;
    tenant: {
      id: string;
      accountName: string;
    };
  };
};

type CustomizationPipelineTarget = "REQUESTS" | "WITHOUT_QUOTE" | "PENDING_CLIENT" | "ACCEPTED";

const customizationPipelineTargets = new Set<CustomizationPipelineTarget>([
  "REQUESTS",
  "WITHOUT_QUOTE",
  "PENDING_CLIENT",
  "ACCEPTED",
]);

const defaultProjectProcessTypes = [
  "DISCOVERY",
  "DESIGN",
  "FRONTEND",
  "BACKEND",
  "INTEGRATIONS",
  "TESTING",
  "DEPLOYMENT",
] as const;

async function ensureProjectCreatedFromAcceptedQuote(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  customPageRequestId: string;
  actorUserId: string;
  moduleId?: string | null;
  submoduleId?: string | null;
  projectNameSeed?: string | null;
}) {
  const slug = `custom-${params.customPageRequestId.slice(-10).toLowerCase()}`;
  const projectName =
    params.projectNameSeed?.trim() || `Proyecto personalizado ${params.customPageRequestId.slice(-6)}`;

  const existing = await params.tx.project.findUnique({
    where: {
      tenantId_slug: {
        tenantId: params.tenantId,
        slug,
      },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await params.tx.project.create({
    data: {
      tenantId: params.tenantId,
      name: projectName,
      slug,
      status: "DISCOVERY",
      moduleId: params.moduleId ?? null,
      submoduleId: params.submoduleId ?? null,
      description: "Proyecto generado automaticamente al aprobar presupuesto.",
      createdById: params.actorUserId,
    },
    select: { id: true },
  });

  await params.tx.projectProcess.createMany({
    data: defaultProjectProcessTypes.map((processType) => ({
      projectId: created.id,
      processType,
      status: processType === "DISCOVERY" ? "IN_PROGRESS" : "PENDING",
      progressPercent: processType === "DISCOVERY" ? 5 : 0,
    })),
  });

  return created.id;
}

function toNullableDate(value: string) {
  return value ? new Date(value) : null;
}

function parseBuenosAiresDateTimeLocal(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) + 3,
      Number(minute),
      Number(second),
    ),
  );
}

function generateTemporaryPassword() {
  return `Vase-${randomUUID().slice(0, 8)}#${Math.floor(100 + Math.random() * 900)}`;
}

function sanitizeModuleVersion(raw: string) {
  const value = raw.trim();
  if (!value) return "1.0.0";
  return value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) || "1.0.0";
}

function hasZipSignature(bytes: Uint8Array) {
  if (bytes.length < 4) return false;
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

async function validateModuleZip(file: File) {
  const maxBytes = 50 * 1024 * 1024;
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("MODULE_ZIP_EXTENSION_INVALID");
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error("MODULE_ZIP_SIZE_INVALID");
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!hasZipSignature(buffer)) {
    throw new Error("MODULE_ZIP_SIGNATURE_INVALID");
  }
  const sha256 = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  return { bytes: buffer, sha256, sizeBytes: file.size, fileName: file.name, mimeType: file.type || "application/zip" };
}

function formatDurationMs(durationMs: number) {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function describeCustomSitePackageError(error: unknown) {
  if (!(error instanceof Error)) {
    return "No pudimos importar el paquete personalizado.";
  }

  switch (error.message) {
    case "MODULE_ZIP_EXTENSION_INVALID":
      return "El archivo debe estar en formato .zip.";
    case "MODULE_ZIP_SIZE_INVALID":
      return "El .zip supera el tamano permitido o esta vacio.";
    case "MODULE_ZIP_SIGNATURE_INVALID":
      return "El archivo no tiene firma valida de zip.";
    case "CUSTOM_SITE_GITHUB_URL_INVALID":
      return "La URL de GitHub no es valida. Usa https://github.com/owner/repo o una rama /tree/rama.";
    case "CUSTOM_SITE_GITHUB_REPOSITORY_NOT_FOUND":
      return "No pudimos acceder a ese repositorio de GitHub. Debe ser publico o accesible.";
    case "CUSTOM_SITE_GITHUB_DOWNLOAD_FAILED":
      return "No pudimos descargar el ZIP del repositorio de GitHub.";
    case "CUSTOM_SITE_INDEX_MISSING":
      return "El paquete debe incluir un index.html publicado, por ejemplo el contenido de dist/ o build/.";
    case "CUSTOM_SITE_PATH_INVALID":
      return "El ZIP contiene rutas no permitidas.";
    case "CUSTOM_SITE_FILE_LIMIT_EXCEEDED":
      return "El paquete tiene demasiados archivos. Maximo permitido: 2000.";
    case "CUSTOM_SITE_SIZE_LIMIT_EXCEEDED":
      return "El paquete descomprimido supera el tamano permitido.";
    default:
      return "No pudimos importar el paquete personalizado.";
  }
}

function validateDownloadedZip(bytes: Uint8Array, fileName: string) {
  const maxBytes = 50 * 1024 * 1024;
  if (bytes.byteLength <= 0 || bytes.byteLength > maxBytes) {
    throw new Error("MODULE_ZIP_SIZE_INVALID");
  }
  if (!hasZipSignature(bytes)) {
    throw new Error("MODULE_ZIP_SIGNATURE_INVALID");
  }
  return {
    bytes,
    sha256: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
    sizeBytes: bytes.byteLength,
    fileName,
    mimeType: "application/zip",
  };
}

async function rebuildPaymentAllocations(paymentId: string) {
  const payment = await prisma.clientPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      tenantId: true,
      category: true,
      paidAmount: true,
    },
  });
  if (!payment) return;

  const [partnerConfig, financialSettings] = await Promise.all([
    prisma.partnerConfig.findFirst({
      where: {
        OR: [{ tenantId: payment.tenantId }, { tenantId: null }],
      },
      orderBy: [{ tenantId: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.financialSettings.findFirst({
      where: {
        OR: [{ tenantId: payment.tenantId }, { tenantId: null }],
      },
      orderBy: [{ tenantId: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  const paidAmount = Number(payment.paidAmount);
  if (paidAmount <= 0) {
    await prisma.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });
    return;
  }

  const alexisPercent = Number(partnerConfig?.alexisPercent ?? 30);
  const darianPercent = Number(partnerConfig?.darianPercent ?? 30);
  const dantePercent = Number(partnerConfig?.dantePercent ?? 30);
  const companyPercent = Number(partnerConfig?.companyPercent ?? 10);
  const tokensToFund = financialSettings?.tokensDefaultToFund ?? true;

  let companyFundAmount = 0;
  let distributableAmount = 0;

  if (payment.category === "HOSTING" || payment.category === "MAINTENANCE") {
    companyFundAmount = paidAmount;
    distributableAmount = 0;
  } else if (payment.category === "TOKENS" && tokensToFund) {
    companyFundAmount = paidAmount;
    distributableAmount = 0;
  } else {
    companyFundAmount = (paidAmount * companyPercent) / 100;
    distributableAmount = Math.max(0, paidAmount - companyFundAmount);
  }

  const allocations: Array<{
    paymentId: string;
    direction: "PARTNER_DISTRIBUTION" | "COMPANY_FUND";
    percentage: number;
    amount: number;
  }> = [];

  if (companyFundAmount > 0) {
    allocations.push({
      paymentId: payment.id,
      direction: "COMPANY_FUND",
      percentage: paidAmount > 0 ? (companyFundAmount / paidAmount) * 100 : 0,
      amount: companyFundAmount,
    });
  }

  if (distributableAmount > 0) {
    allocations.push(
      {
        paymentId: payment.id,
        direction: "PARTNER_DISTRIBUTION",
        percentage: alexisPercent,
        amount: (distributableAmount * alexisPercent) / 100,
      },
      {
        paymentId: payment.id,
        direction: "PARTNER_DISTRIBUTION",
        percentage: darianPercent,
        amount: (distributableAmount * darianPercent) / 100,
      },
      {
        paymentId: payment.id,
        direction: "PARTNER_DISTRIBUTION",
        percentage: dantePercent,
        amount: (distributableAmount * dantePercent) / 100,
      },
    );
  }

  await prisma.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });
  if (allocations.length > 0) {
    await prisma.paymentAllocation.createMany({ data: allocations });
  }
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

    const temporaryPassword = parsed.data.password || generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const now = new Date();
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        platformRole: parsed.data.platformRole,
        locale: "es",
        ...buildAdminCreatedUserVerification(now),
        forcePasswordChange: true,
        tempPasswordIssuedAt: now,
        internalProfile: {
          create: {
            type: "SUPPORT",
            tempPasswordActive: true,
            mustResetPassword: true,
            tempPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
            availability: "OFFLINE",
          },
        },
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
    return { success: `Usuario interno creado. Contrasena temporal: ${temporaryPassword}` };
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
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

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
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

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

export async function deleteAdminModuleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = deleteAdminModuleSchema.safeParse({
      moduleId: formData.get("moduleId"),
    });
    if (!parsed.success) {
      return { error: "Modulo invalido." };
    }

    const existing = await prisma.module.findUnique({
      where: { id: parsed.data.moduleId },
      select: { id: true, name: true },
    });
    if (!existing) {
      return { error: "El modulo ya no existe." };
    }

    await prisma.module.delete({
      where: { id: parsed.data.moduleId },
    });

    await createAuditLog({
      action: "platform.module_deleted",
      targetType: "module",
      targetId: existing.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { name: existing.name },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Modulo eliminado definitivamente." };
  } catch {
    return { error: "No pudimos eliminar el modulo." };
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

export async function updateUserTenantAccessAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateUserTenantAccessSchema.safeParse({
      userId: formData.get("userId"),
      tenantId: formData.get("tenantId"),
      tenantRole: formData.get("tenantRole"),
      membershipStatus: formData.get("membershipStatus"),
      businessAccess: formData.get("businessAccess") === "on",
      labsAccess: formData.get("labsAccess") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa usuario, tenant, rol y modulos antes de guardar." };
    }

    await ensureModuleCatalogSynced();

    const [user, tenant] = await Promise.all([
      prisma.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, email: true },
      }),
      prisma.tenant.findUnique({
        where: { id: parsed.data.tenantId },
        select: {
          id: true,
          accountName: true,
          name: true,
          billingEmail: true,
          subscription: {
            select: {
              plan: true,
              premiumEnabled: true,
            },
          },
        },
      }),
    ]);

    if (!user || !tenant) {
      return { error: "No encontramos el usuario o tenant seleccionado." };
    }

    const now = new Date();
    const activeModuleIds = buildActiveAccessModuleIds(parsed.data);
    const tenantPlan = resolveTenantPlanFromSubscription(tenant.subscription);

    await prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          userId_tenantId: {
            userId: parsed.data.userId,
            tenantId: parsed.data.tenantId,
          },
        },
        update: {
          role: parsed.data.tenantRole,
          status: parsed.data.membershipStatus,
        },
        create: {
          userId: parsed.data.userId,
          tenantId: parsed.data.tenantId,
          role: parsed.data.tenantRole,
          status: parsed.data.membershipStatus,
        },
      });

      await tx.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: parsed.data.tenantId,
            moduleId: userAccessModuleIds.business,
          },
        },
        update: {
          isActive: parsed.data.businessAccess,
          activatedAt: parsed.data.businessAccess ? now : null,
        },
        create: {
          tenantId: parsed.data.tenantId,
          moduleId: userAccessModuleIds.business,
          isActive: parsed.data.businessAccess,
          activatedAt: parsed.data.businessAccess ? now : null,
        },
      });

      await tx.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: parsed.data.tenantId,
            moduleId: userAccessModuleIds.labs,
          },
        },
        update: {
          isActive: parsed.data.labsAccess,
          activatedAt: parsed.data.labsAccess ? now : null,
        },
        create: {
          tenantId: parsed.data.tenantId,
          moduleId: userAccessModuleIds.labs,
          isActive: parsed.data.labsAccess,
          activatedAt: parsed.data.labsAccess ? now : null,
        },
      });

      await syncUserModuleAccess({
        tx,
        userId: parsed.data.userId,
        moduleIds: activeModuleIds,
      });

      await syncTenantProductAndLabsWorkspace({
        tx,
        tenantId: parsed.data.tenantId,
        moduleIds: activeModuleIds,
        tenantPlan,
        tenantName: tenant.name,
        userEmail: user.email || tenant.billingEmail || "",
      });
    });

    await createAuditLog({
      action: "platform.user_tenant_access_updated",
      targetType: "membership",
      targetId: `${parsed.data.userId}:${parsed.data.tenantId}`,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        userEmail: user.email,
        tenant: tenant.accountName,
        tenantRole: parsed.data.tenantRole,
        membershipStatus: parsed.data.membershipStatus,
        businessAccess: parsed.data.businessAccess,
        labsAccess: parsed.data.labsAccess,
      },
    });

    revalidatePath("/app/admin/users");
    revalidatePath("/app/admin/modules");
    revalidatePath("/app");
    return { success: "Acceso del usuario actualizado." };
  } catch {
    return { error: "No pudimos actualizar el acceso del usuario." };
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
      return { error: "Revisa tÃ­tulo, descripciÃ³n, categorÃ­a y tono del anuncio." };
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
      return { error: "ID de anuncio invÃ¡lido." };
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

export async function createModuleSubmoduleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = createModuleSubmoduleSchema.safeParse({
      moduleId: formData.get("moduleId"),
      key: sanitizeText(String(formData.get("key") ?? "")),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      route: sanitizeText(String(formData.get("route") ?? "")),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return { error: "Revisa los campos del submodulo." };
    }

    const created = await prisma.moduleSubmodule.create({
      data: {
        moduleId: parsed.data.moduleId,
        key: parsed.data.key,
        name: parsed.data.name,
        description: parsed.data.description,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.module_submodule_created",
      targetType: "module_submodule",
      targetId: created.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { moduleId: created.moduleId, key: created.key, route: created.route },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Submodulo creado." };
  } catch {
    return { error: "No pudimos crear el submodulo." };
  }
}

export async function updateModuleSubmoduleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = updateModuleSubmoduleSchema.safeParse({
      submoduleId: formData.get("submoduleId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      route: sanitizeText(String(formData.get("route") ?? "")),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return { error: "Revisa los datos del submodulo." };
    }

    const updated = await prisma.moduleSubmodule.update({
      where: { id: parsed.data.submoduleId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        route: parsed.data.route,
        isActive: parsed.data.isActive,
      },
    });

    await createAuditLog({
      action: "platform.module_submodule_updated",
      targetType: "module_submodule",
      targetId: updated.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { route: updated.route, isActive: updated.isActive },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Submodulo actualizado." };
  } catch {
    return { error: "No pudimos actualizar el submodulo." };
  }
}

export async function deleteModuleSubmoduleAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);

    const parsed = deleteModuleSubmoduleSchema.safeParse({
      submoduleId: formData.get("submoduleId"),
    });
    if (!parsed.success) {
      return { error: "Submodulo invalido." };
    }

    const existing = await prisma.moduleSubmodule.findUnique({
      where: { id: parsed.data.submoduleId },
      select: { id: true, name: true, moduleId: true },
    });
    if (!existing) {
      return { error: "El submodulo ya no existe." };
    }

    await prisma.moduleSubmodule.delete({
      where: { id: parsed.data.submoduleId },
    });

    await createAuditLog({
      action: "platform.module_submodule_deleted",
      targetType: "module_submodule",
      targetId: existing.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { name: existing.name, moduleId: existing.moduleId },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Submodulo eliminado definitivamente." };
  } catch {
    return { error: "No pudimos eliminar el submodulo." };
  }
}

function parseNullableInteger(formData: FormData, field: "minValue" | "maxValue") {
  const rawValue = String(formData.get(field) ?? "").trim();
  return rawValue ? Number(rawValue) : null;
}

function toModuleFeatureJsonValue(value: boolean | number | string | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

function isPrismaUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function mapModuleFeatureActionError(error: unknown, fallback: string) {
  if (isPrismaUniqueConflict(error)) return "Ya existe una característica con esa clave en este alcance.";
  if (error instanceof Error) {
    if (error.message === "FORBIDDEN") return "No tienes permisos para gestionar características.";
    if (error.message === "MODULE_FEATURE_NOT_FOUND") return "La característica ya no existe.";
    if (error.message === "Las características solo están disponibles para Vase Business.") {
      return "Las características solo están disponibles para Vase Business.";
    }
    if (error.message === "El submódulo no pertenece al módulo Business seleccionado.") {
      return "El submódulo seleccionado no pertenece a Vase Business.";
    }
    if (error.message === "Las características solo pueden asignarse a Plantilla o Personalizado.") {
      return "Las características solo pueden asignarse a Plantilla o Personalizado.";
    }
  }
  return fallback;
}

export async function createModuleFeatureAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);
    const valueType = formData.get("valueType");
    const parsed = createModuleFeatureSchema.safeParse({
      moduleId: formData.get("moduleId"),
      submoduleId: String(formData.get("submoduleId") ?? "").trim() || null,
      key: String(formData.get("key") ?? ""),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeNullableText(String(formData.get("description") ?? "")) ?? null,
      valueType,
      trialDefault: parseModuleFeatureDefault(formData, "trialDefault", valueType),
      activeDefault: parseModuleFeatureDefault(formData, "activeDefault", valueType),
      minValue: parseNullableInteger(formData, "minValue"),
      maxValue: parseNullableInteger(formData, "maxValue"),
      sortOrder: formData.get("sortOrder"),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return { error: "Revisa los valores y límites de la característica." };

    const result = await prisma.$transaction(async (tx) => {
      const scope = await getBusinessFeatureScope(tx, parsed.data);
      const created = await tx.moduleFeature.create({
        data: {
          // scopeKey is deliberately omitted: it is migration-only and is not
          // represented by the Prisma ModuleFeature public contract.
          moduleId: scope.moduleId,
          submoduleId: scope.submoduleId,
          key: parsed.data.key,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          valueType: parsed.data.valueType,
          trialDefault: toModuleFeatureJsonValue(parsed.data.trialDefault),
          activeDefault: toModuleFeatureJsonValue(parsed.data.activeDefault),
          minValue: parsed.data.minValue,
          maxValue: parsed.data.maxValue,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });
      const auditPayload = {
        action: "platform.module_feature_created",
        targetType: "module_feature",
        targetId: created.id,
        actorUserId: adminSession.user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { moduleId: created.moduleId, submoduleId: created.submoduleId, key: created.key },
      };
      await persistAuditLog(tx, auditPayload);
      return { auditPayload };
    });
    emitAuditLogEvent(result.auditPayload);
    revalidatePath("/app/admin/modules");
    revalidatePath("/modules");
    return { success: "Característica creada." };
  } catch (error) {
    return { error: mapModuleFeatureActionError(error, "No pudimos crear la característica.") };
  }
}

export async function updateModuleFeatureAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);
    const valueType = formData.get("valueType");
    const parsed = updateModuleFeatureSchema.safeParse({
      featureId: formData.get("featureId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      description: sanitizeNullableText(String(formData.get("description") ?? "")) ?? null,
      valueType,
      trialDefault: parseModuleFeatureDefault(formData, "trialDefault", valueType),
      activeDefault: parseModuleFeatureDefault(formData, "activeDefault", valueType),
      minValue: parseNullableInteger(formData, "minValue"),
      maxValue: parseNullableInteger(formData, "maxValue"),
      sortOrder: formData.get("sortOrder"),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return { error: "Revisa los valores y límites de la característica." };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.moduleFeature.findUnique({
        where: { id: parsed.data.featureId },
        select: { id: true, moduleId: true, submoduleId: true, key: true },
      });
      if (!existing) throw new Error("MODULE_FEATURE_NOT_FOUND");
      await getBusinessFeatureScope(tx, existing);
      const updated = await tx.moduleFeature.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          valueType: parsed.data.valueType,
          trialDefault: toModuleFeatureJsonValue(parsed.data.trialDefault),
          activeDefault: toModuleFeatureJsonValue(parsed.data.activeDefault),
          minValue: parsed.data.minValue,
          maxValue: parsed.data.maxValue,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });
      const auditPayload = {
        action: "platform.module_feature_updated",
        targetType: "module_feature",
        targetId: updated.id,
        actorUserId: adminSession.user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { moduleId: updated.moduleId, submoduleId: updated.submoduleId, key: updated.key },
      };
      await persistAuditLog(tx, auditPayload);
      return { auditPayload };
    });
    emitAuditLogEvent(result.auditPayload);
    revalidatePath("/app/admin/modules");
    revalidatePath("/modules");
    return { success: "Característica actualizada." };
  } catch (error) {
    return { error: mapModuleFeatureActionError(error, "No pudimos actualizar la característica.") };
  }
}

export async function deleteModuleFeatureAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.MODULES);
    const parsed = deleteModuleFeatureSchema.safeParse({ featureId: formData.get("featureId") });
    if (!parsed.success) return { error: "Característica inválida." };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.moduleFeature.findUnique({
        where: { id: parsed.data.featureId },
        select: { id: true, moduleId: true, submoduleId: true, key: true },
      });
      if (!existing) throw new Error("MODULE_FEATURE_NOT_FOUND");
      await getBusinessFeatureScope(tx, existing);
      await tx.moduleFeature.delete({ where: { id: existing.id } });
      const auditPayload = {
        action: "platform.module_feature_deleted",
        targetType: "module_feature",
        targetId: existing.id,
        actorUserId: adminSession.user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { moduleId: existing.moduleId, submoduleId: existing.submoduleId, key: existing.key },
      };
      await persistAuditLog(tx, auditPayload);
      return { auditPayload };
    });
    emitAuditLogEvent(result.auditPayload);
    revalidatePath("/app/admin/modules");
    revalidatePath("/modules");
    return { success: "Característica eliminada." };
  } catch (error) {
    return { error: mapModuleFeatureActionError(error, "No pudimos eliminar la característica.") };
  }
}

export async function updateModuleSubmodulePricingAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateModuleSubmodulePricingSchema.safeParse({
      submoduleId: formData.get("submoduleId"),
      price: formData.get("price"),
      currency: sanitizeText(String(formData.get("currency") ?? "")),
      type: formData.get("type"),
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return { error: "Revisa precio, moneda y tipo del submodulo." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.moduleSubmodulePricing.updateMany({
        where: { submoduleId: parsed.data.submoduleId, isActive: true },
        data: { isActive: false },
      });
      await tx.moduleSubmodulePricing.create({
        data: {
          submoduleId: parsed.data.submoduleId,
          price: parsed.data.price,
          currency: parsed.data.currency,
          type: normalizePricingType(parsed.data.type),
          isActive: parsed.data.isActive,
        },
      });
    });

    await createAuditLog({
      action: "platform.module_submodule_pricing_updated",
      targetType: "module_submodule_pricing",
      targetId: parsed.data.submoduleId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { price: parsed.data.price, currency: parsed.data.currency, type: parsed.data.type },
    });

    revalidatePath("/app/admin/modules");
    return { success: "Pricing del submodulo actualizado." };
  } catch {
    return { error: "No pudimos actualizar el pricing del submodulo." };
  }
}

export async function uploadModuleArtifactAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const moduleId = sanitizeNullableText(String(formData.get("moduleId") ?? "")) ?? undefined;
    const submoduleId = sanitizeNullableText(String(formData.get("submoduleId") ?? "")) ?? undefined;
    const version = sanitizeModuleVersion(String(formData.get("version") ?? "1.0.0"));
    const file = formData.get("artifact");
    if (!(file instanceof File)) {
      return { error: "Debes subir un archivo .zip." };
    }
    if (!moduleId && !submoduleId) {
      return { error: "Debes asociar el artefacto a un modulo o submodulo." };
    }

    const validated = await validateModuleZip(file);
    const relativePath = `modules/${moduleId ?? "submodule"}/${submoduleId ?? "root"}/${Date.now()}-${validated.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const saved = await saveLocalUpload({
      relativePath,
      bytes: validated.bytes,
    });

    await prisma.moduleArtifact.create({
      data: {
        moduleId: moduleId ?? null,
        submoduleId: submoduleId ?? null,
        version,
        fileName: validated.fileName,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        sha256: validated.sha256,
        storagePath: saved.relativePath,
        createdByUserId: adminSession.user.id,
      },
    });

    await createAuditLog({
      action: "platform.module_artifact_uploaded",
      targetType: "module_artifact",
      targetId: moduleId ?? submoduleId ?? "unknown",
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { moduleId, submoduleId, version, sizeBytes: validated.sizeBytes, sha256: validated.sha256 },
    });

    revalidatePath("/app/admin/modules");
    return { success: "ZIP cargado y almacenado correctamente." };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MODULE_ZIP_")) {
      return { error: "El archivo ZIP no es vÃ¡lido (extensiÃ³n, tamaÃ±o o firma)." };
    }
    return { error: "No pudimos cargar el artefacto ZIP." };
  }
}

export async function publishModuleArtifactAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = publishModuleArtifactSchema.safeParse({
      artifactId: formData.get("artifactId"),
    });
    if (!parsed.success) {
      return { error: "Artefacto invÃ¡lido." };
    }

    const artifact = await prisma.moduleArtifact.findUnique({
      where: { id: parsed.data.artifactId },
      select: {
        id: true,
        moduleId: true,
        submoduleId: true,
      },
    });
    if (!artifact) {
      return { error: "No encontramos el artefacto." };
    }

    await prisma.$transaction(async (tx) => {
      if (artifact.moduleId) {
        await tx.moduleArtifact.updateMany({
          where: { moduleId: artifact.moduleId, isPublished: true },
          data: { isPublished: false, publishedAt: null },
        });
      }
      if (artifact.submoduleId) {
        await tx.moduleArtifact.updateMany({
          where: { submoduleId: artifact.submoduleId, isPublished: true },
          data: { isPublished: false, publishedAt: null },
        });
      }
      await tx.moduleArtifact.update({
        where: { id: artifact.id },
        data: { isPublished: true, publishedAt: new Date() },
      });
      if (artifact.moduleId) {
        await tx.tenantModule.updateMany({
          where: { moduleId: artifact.moduleId, isActive: true },
          data: { activeArtifactId: artifact.id },
        });
      }
      if (artifact.submoduleId) {
        await tx.tenantSubmodule.updateMany({
          where: { submoduleId: artifact.submoduleId, isActive: true },
          data: { activeArtifactId: artifact.id },
        });
      }
    });

    await createAuditLog({
      action: "platform.module_artifact_published",
      targetType: "module_artifact",
      targetId: artifact.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { moduleId: artifact.moduleId, submoduleId: artifact.submoduleId },
    });

    revalidatePath("/app/admin/modules");
    return { success: "VersiÃ³n publicada." };
  } catch {
    return { error: "No pudimos publicar el artefacto." };
  }
}

export async function setTenantModuleActivationAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = setTenantModuleActivationSchema.safeParse({
      tenantId: formData.get("tenantId"),
      moduleId: formData.get("moduleId"),
      isActive: formData.get("isActive") === "true",
    });
    if (!parsed.success) {
      return { error: "Datos de activaciÃ³n invÃ¡lidos." };
    }

    const [publishedArtifact, tenant, currentTenantModules] = await Promise.all([
      prisma.moduleArtifact.findFirst({
        where: { moduleId: parsed.data.moduleId, isPublished: true },
        orderBy: { publishedAt: "desc" },
        select: { id: true },
      }),
      prisma.tenant.findUnique({
        where: { id: parsed.data.tenantId },
        select: {
          id: true,
          name: true,
          billingEmail: true,
          subscription: {
            select: {
              plan: true,
              premiumEnabled: true,
            },
          },
        },
      }),
      prisma.tenantModule.findMany({
        where: {
          tenantId: parsed.data.tenantId,
          moduleId: { in: [userAccessModuleIds.business, userAccessModuleIds.labs] },
        },
        select: {
          moduleId: true,
          isActive: true,
        },
      }),
    ]);

    if (!tenant) {
      return { error: "Tenant no encontrado." };
    }

    const currentModuleState = new Map(currentTenantModules.map((module) => [module.moduleId, module.isActive]));
    if (parsed.data.moduleId === userAccessModuleIds.business || parsed.data.moduleId === userAccessModuleIds.labs) {
      currentModuleState.set(parsed.data.moduleId, parsed.data.isActive);
    }
    const activeModuleIds = [userAccessModuleIds.business, userAccessModuleIds.labs].filter(
      (moduleId) => currentModuleState.get(moduleId) === true,
    );
    const tenantPlan = resolveTenantPlanFromSubscription(tenant.subscription);

    await prisma.$transaction(async (tx) => {
      await tx.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: parsed.data.tenantId,
            moduleId: parsed.data.moduleId,
          },
        },
        update: {
          isActive: parsed.data.isActive,
          activatedAt: parsed.data.isActive ? new Date() : null,
          activeArtifactId: publishedArtifact?.id ?? null,
        },
        create: {
          tenantId: parsed.data.tenantId,
          moduleId: parsed.data.moduleId,
          isActive: parsed.data.isActive,
          activatedAt: parsed.data.isActive ? new Date() : null,
          activeArtifactId: publishedArtifact?.id ?? null,
        },
      });

      await syncTenantProductAndLabsWorkspace({
        tx,
        tenantId: parsed.data.tenantId,
        moduleIds: activeModuleIds,
        tenantPlan,
        tenantName: tenant.name,
        userEmail: tenant.billingEmail || "",
      });
    });

    await createAuditLog({
      action: "platform.tenant_module_activation_updated",
      targetType: "tenant_module",
      targetId: `${parsed.data.tenantId}:${parsed.data.moduleId}`,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { isActive: parsed.data.isActive },
    });

    revalidatePath("/app/admin/modules");
    return { success: parsed.data.isActive ? "MÃ³dulo activado para tenant." : "MÃ³dulo desactivado para tenant." };
  } catch {
    return { error: "No pudimos actualizar la activaciÃ³n del mÃ³dulo." };
  }
}

export async function setTenantSubmoduleActivationAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = setTenantSubmoduleActivationSchema.safeParse({
      tenantId: formData.get("tenantId"),
      submoduleId: formData.get("submoduleId"),
      isActive: formData.get("isActive") === "true",
    });
    if (!parsed.success) {
      return { error: "Datos de activaciÃ³n invÃ¡lidos." };
    }

    const submodule = await prisma.moduleSubmodule.findUnique({
      where: { id: parsed.data.submoduleId },
      select: { moduleId: true },
    });
    if (!submodule) {
      return { error: "SubmÃ³dulo no encontrado." };
    }

    if (parsed.data.isActive) {
      const parentActivation = await prisma.tenantModule.findUnique({
        where: {
          tenantId_moduleId: {
            tenantId: parsed.data.tenantId,
            moduleId: submodule.moduleId,
          },
        },
        select: { isActive: true },
      });
      if (!parentActivation?.isActive) {
        return { error: "Primero debes activar el mÃ³dulo padre para este tenant." };
      }
    }

    const publishedArtifact = await prisma.moduleArtifact.findFirst({
      where: { submoduleId: parsed.data.submoduleId, isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: { id: true },
    });

    await prisma.tenantSubmodule.upsert({
      where: {
        tenantId_submoduleId: {
          tenantId: parsed.data.tenantId,
          submoduleId: parsed.data.submoduleId,
        },
      },
      update: {
        isActive: parsed.data.isActive,
        activatedAt: parsed.data.isActive ? new Date() : null,
        activeArtifactId: publishedArtifact?.id ?? null,
      },
      create: {
        tenantId: parsed.data.tenantId,
        submoduleId: parsed.data.submoduleId,
        isActive: parsed.data.isActive,
        activatedAt: parsed.data.isActive ? new Date() : null,
        activeArtifactId: publishedArtifact?.id ?? null,
      },
    });

    await createAuditLog({
      action: "platform.tenant_submodule_activation_updated",
      targetType: "tenant_submodule",
      targetId: `${parsed.data.tenantId}:${parsed.data.submoduleId}`,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { isActive: parsed.data.isActive },
    });

    revalidatePath("/app/admin/modules");
    return { success: parsed.data.isActive ? "SubmÃ³dulo activado para tenant." : "SubmÃ³dulo desactivado para tenant." };
  } catch {
    return { error: "No pudimos actualizar la activaciÃ³n del submÃ³dulo." };
  }
}

export async function createDeveloperUserAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createDeveloperUserSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      specialty: sanitizeNullableText(String(formData.get("specialty") ?? "")) ?? undefined,
      phone: sanitizeNullableText(String(formData.get("phone") ?? "")) ?? undefined,
    });
    if (!parsed.success) {
      return { error: "Revisa nombre, email y datos del desarrollador." };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) return { error: "Ya existe un usuario con ese email." };

    const temporaryPassword = parsed.data.password || generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const now = new Date();

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        platformRole: "DEVELOPER",
        locale: "es",
        ...buildAdminCreatedUserVerification(now),
        forcePasswordChange: true,
        tempPasswordIssuedAt: now,
        internalProfile: {
          create: {
            type: "DEVELOPER",
            specialty: parsed.data.specialty ?? null,
            phone: parsed.data.phone ?? null,
            tempPasswordActive: true,
            mustResetPassword: true,
            tempPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
          },
        },
      },
    });

    await createAuditLog({
      action: "platform.developer_user_created",
      targetType: "user",
      targetId: user.id,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        role: "DEVELOPER",
        specialty: parsed.data.specialty ?? null,
      },
    });

    revalidatePath("/app/admin");
    return { success: `Desarrollador creado. Contrasena temporal: ${temporaryPassword}` };
  } catch {
    return { error: "No pudimos crear el desarrollador." };
  }
}

export async function upsertUserRolesAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = upsertUserRolesSchema.safeParse({
      userId: formData.get("userId"),
      roles: formData.getAll("roles"),
    });

    if (!parsed.success) {
      return { error: "Revisa el usuario y los roles asignados." };
    }

    await prisma.$transaction(async (tx) => {
      for (const roleKey of parsed.data.roles) {
        await tx.role.upsert({
          where: { key: roleKey },
          update: {
            name: roleKey,
          },
          create: {
            key: roleKey,
            name: roleKey,
            isSystem: true,
          },
        });
      }

      const roleRecords = await tx.role.findMany({
        where: { key: { in: parsed.data.roles } },
        select: { id: true },
      });
      const roleIds = roleRecords.map((role) => role.id);

      await tx.userRole.deleteMany({
        where: { userId: parsed.data.userId },
      });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: parsed.data.userId,
            roleId,
          })),
        });
      }
    });

    await createAuditLog({
      action: "platform.user_roles_updated",
      targetType: "user",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        roles: parsed.data.roles,
      },
    });

    revalidatePath("/app/admin/users");
    return { success: "Roles del usuario actualizados." };
  } catch {
    return { error: "No pudimos actualizar los roles del usuario." };
  }
}

export async function createProjectWithProcessesAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createProjectWithProcessesSchema.safeParse({
      tenantId: formData.get("tenantId"),
      name: sanitizeText(String(formData.get("name") ?? "")),
      slug: sanitizeText(String(formData.get("slug") ?? "")).toLowerCase(),
      status: formData.get("status"),
      moduleId: String(formData.get("moduleId") ?? ""),
      submoduleId: String(formData.get("submoduleId") ?? ""),
      clientAccountId: String(formData.get("clientAccountId") ?? ""),
      description: sanitizeNullableText(String(formData.get("description") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return { error: "Revisa tenant, nombre y estado del proyecto." };
    }

    const processTypes = ["DISCOVERY", "DESIGN", "FRONTEND", "BACKEND", "INTEGRATIONS", "TESTING", "DEPLOYMENT"] as const;

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          tenantId: parsed.data.tenantId,
          name: parsed.data.name,
          slug: parsed.data.slug,
          status: parsed.data.status,
          moduleId: parsed.data.moduleId || null,
          submoduleId: parsed.data.submoduleId || null,
          clientAccountId: parsed.data.clientAccountId || null,
          description: parsed.data.description || null,
          createdById: adminSession.user.id,
        },
      });

      await tx.projectProcess.createMany({
        data: processTypes.map((processType) => ({
          projectId: created.id,
          processType,
          status: processType === "DISCOVERY" ? "IN_PROGRESS" : "PENDING",
          progressPercent: processType === "DISCOVERY" ? 5 : 0,
        })),
      });

      return created;
    });

    await createAuditLog({
      action: "platform.project_created_with_processes",
      targetType: "project",
      targetId: project.id,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        slug: parsed.data.slug,
        status: parsed.data.status,
      },
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/business");
    return { success: "Proyecto creado con procesos base." };
  } catch {
    return { error: "No pudimos crear el proyecto con sus procesos." };
  }
}

export async function updateUserTenantAccessSnapshotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const payloadRaw = String(formData.get("payload") ?? "");
    const payload = JSON.parse(payloadRaw || "{}");
    const parsed = updateUserTenantAccessSnapshotSchema.safeParse(payload);

    if (!parsed.success) {
      return { error: "Datos invalidos. Revisa rol, estado y accesos del modulo." };
    }

    await ensureModuleCatalogSynced();

    const [user, tenant, submoduleCatalog] = await Promise.all([
      prisma.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, email: true },
      }),
      prisma.tenant.findUnique({
        where: { id: parsed.data.tenantId },
        select: {
          id: true,
          accountName: true,
          name: true,
          billingEmail: true,
          subscription: {
            select: {
              plan: true,
              premiumEnabled: true,
            },
          },
        },
      }),
      prisma.moduleSubmodule.findMany({
        where: {
          id: { in: parsed.data.modules.flatMap((module) => module.submodules.map((submodule) => submodule.submoduleId)) },
        },
        select: { id: true, moduleId: true, key: true },
      }),
    ]);

    if (!user || !tenant) {
      return { error: "No encontramos el usuario o tenant seleccionado." };
    }

    const submoduleParentMap = new Map(submoduleCatalog.map((item) => [item.id, item.moduleId]));
    const submoduleKeyMap = new Map(submoduleCatalog.map((item) => [item.id, item.key]));
    const moduleStateMap = new Map(parsed.data.modules.map((module) => [module.moduleId, module.isActive]));
    const activeModuleIds = parsed.data.modules
      .filter((module) => module.isActive)
      .map((module) => module.moduleId);
    const tenantPlan = resolveTenantPlanFromSubscription(tenant.subscription);

    for (const moduleAccess of parsed.data.modules) {
      for (const submodule of moduleAccess.submodules) {
        const parentModuleId = submoduleParentMap.get(submodule.submoduleId);
        if (!parentModuleId) {
          return { error: "Hay funcionalidades que ya no existen. Recarga la pagina e intenta de nuevo." };
        }
        if (submodule.isActive && !moduleStateMap.get(parentModuleId)) {
          return { error: "No puedes activar funcionalidades con el modulo padre desactivado." };
        }
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          userId_tenantId: {
            userId: parsed.data.userId,
            tenantId: parsed.data.tenantId,
          },
        },
        update: {
          role: parsed.data.tenantRole,
          status: parsed.data.membershipStatus,
        },
        create: {
          userId: parsed.data.userId,
          tenantId: parsed.data.tenantId,
          role: parsed.data.tenantRole,
          status: parsed.data.membershipStatus,
        },
      });

      for (const moduleAccess of parsed.data.modules) {
        const publishedArtifact = await tx.moduleArtifact.findFirst({
          where: { moduleId: moduleAccess.moduleId, isPublished: true },
          orderBy: { publishedAt: "desc" },
          select: { id: true },
        });

        await tx.tenantModule.upsert({
          where: {
            tenantId_moduleId: {
              tenantId: parsed.data.tenantId,
              moduleId: moduleAccess.moduleId,
            },
          },
          update: {
            isActive: moduleAccess.isActive,
            activatedAt: moduleAccess.isActive ? now : null,
            activeArtifactId: publishedArtifact?.id ?? null,
          },
          create: {
            tenantId: parsed.data.tenantId,
            moduleId: moduleAccess.moduleId,
            isActive: moduleAccess.isActive,
            activatedAt: moduleAccess.isActive ? now : null,
            activeArtifactId: publishedArtifact?.id ?? null,
          },
        });
      }

      await syncUserModuleAccess({
        tx,
        userId: parsed.data.userId,
        moduleIds: activeModuleIds,
      });

      await syncTenantProductAndLabsWorkspace({
        tx,
        tenantId: parsed.data.tenantId,
        moduleIds: activeModuleIds,
        tenantPlan,
        labsSubmodules: parsed.data.modules.flatMap((moduleAccess) =>
          moduleAccess.submodules
            .filter((submodule) => submodule.isActive && moduleAccess.isActive)
            .map((submodule) => ({
              moduleId: submoduleParentMap.get(submodule.submoduleId) ?? "",
              key: submoduleKeyMap.get(submodule.submoduleId) ?? null,
              isActive: true,
            })),
        ),
        tenantName: tenant.name,
        userEmail: user.email || tenant.billingEmail || "",
      });

      for (const moduleAccess of parsed.data.modules) {
        for (const submodule of moduleAccess.submodules) {
          const publishedArtifact = await tx.moduleArtifact.findFirst({
            where: { submoduleId: submodule.submoduleId, isPublished: true },
            orderBy: { publishedAt: "desc" },
            select: { id: true },
          });

          await tx.tenantSubmodule.upsert({
            where: {
              tenantId_submoduleId: {
                tenantId: parsed.data.tenantId,
                submoduleId: submodule.submoduleId,
              },
            },
            update: {
              isActive: submodule.isActive && moduleAccess.isActive,
              activatedAt: submodule.isActive && moduleAccess.isActive ? now : null,
              activeArtifactId: publishedArtifact?.id ?? null,
            },
            create: {
              tenantId: parsed.data.tenantId,
              submoduleId: submodule.submoduleId,
              isActive: submodule.isActive && moduleAccess.isActive,
              activatedAt: submodule.isActive && moduleAccess.isActive ? now : null,
              activeArtifactId: publishedArtifact?.id ?? null,
            },
          });
        }
      }
    });

    await createAuditLog({
      action: "platform.user_tenant_access_snapshot_updated",
      targetType: "membership",
      targetId: `${parsed.data.userId}:${parsed.data.tenantId}`,
      tenantId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        userEmail: user.email,
        tenant: tenant.accountName,
        tenantRole: parsed.data.tenantRole,
        membershipStatus: parsed.data.membershipStatus,
        modules: parsed.data.modules.map((module) => ({
          moduleId: module.moduleId,
          isActive: module.isActive,
          activeSubmodules: module.submodules.filter((submodule) => submodule.isActive).map((submodule) => submodule.submoduleId),
        })),
      },
    });

    revalidatePath("/app/admin/users");
    revalidatePath("/app/admin/modules");
    revalidatePath("/app");
    return { success: "Accesos guardados correctamente." };
  } catch {
    return { error: "No pudimos guardar los accesos del usuario." };
  }
}

export async function createManualUserByAdminAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createManualUserByAdminSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      tenantId: String(formData.get("tenantId") ?? ""),
      tenantRole: formData.get("tenantRole"),
      membershipStatus: formData.get("membershipStatus"),
      businessAccess: formData.get("businessAccess") === "on",
      labsAccess: formData.get("labsAccess") === "on",
      forcePasswordChange: formData.get("forcePasswordChange") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, email, contrasena y acceso al tenant." };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) {
      return { error: "Ya existe un usuario con ese email." };
    }

    const tenantId = parsed.data.tenantId ? parsed.data.tenantId : null;
    let tenantForManualAccess: {
      id: string;
      name: string;
      billingEmail: string | null;
      subscription: {
        plan: "START" | "PREMIUM";
        premiumEnabled: boolean;
      } | null;
    } | null = null;

    if (tenantId) {
      await ensureModuleCatalogSynced();
      tenantForManualAccess = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          billingEmail: true,
          subscription: {
            select: {
              plan: true,
              premiumEnabled: true,
            },
          },
        },
      });
      if (!tenantForManualAccess) {
        return { error: "El tenant seleccionado no existe." };
      }
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();
    const activeModuleIds = buildActiveAccessModuleIds(parsed.data);
    const tenantPlan = resolveTenantPlanFromSubscription(tenantForManualAccess?.subscription);

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          platformRole: "USER",
          locale: "es",
          ...buildAdminCreatedUserVerification(now),
          forcePasswordChange: parsed.data.forcePasswordChange,
          tempPasswordIssuedAt: parsed.data.forcePasswordChange ? now : null,
          passwordChangedAt: now,
        },
      });

      if (tenantId) {
        await tx.membership.upsert({
          where: {
            userId_tenantId: {
              userId: user.id,
              tenantId,
            },
          },
          update: {
            role: parsed.data.tenantRole,
            status: parsed.data.membershipStatus,
          },
          create: {
            userId: user.id,
            tenantId,
            role: parsed.data.tenantRole,
            status: parsed.data.membershipStatus,
          },
        });

        await tx.tenantModule.upsert({
          where: {
            tenantId_moduleId: {
              tenantId,
              moduleId: userAccessModuleIds.business,
            },
          },
          update: {
            isActive: parsed.data.businessAccess,
            activatedAt: parsed.data.businessAccess ? now : null,
          },
          create: {
            tenantId,
            moduleId: userAccessModuleIds.business,
            isActive: parsed.data.businessAccess,
            activatedAt: parsed.data.businessAccess ? now : null,
          },
        });

        await tx.tenantModule.upsert({
          where: {
            tenantId_moduleId: {
              tenantId,
              moduleId: userAccessModuleIds.labs,
            },
          },
          update: {
            isActive: parsed.data.labsAccess,
            activatedAt: parsed.data.labsAccess ? now : null,
          },
          create: {
            tenantId,
            moduleId: userAccessModuleIds.labs,
            isActive: parsed.data.labsAccess,
            activatedAt: parsed.data.labsAccess ? now : null,
          },
        });

        await syncUserModuleAccess({
          tx,
          userId: user.id,
          moduleIds: activeModuleIds,
        });

        await syncTenantProductAndLabsWorkspace({
          tx,
          tenantId,
          moduleIds: activeModuleIds,
          tenantPlan,
          tenantName: tenantForManualAccess?.name ?? parsed.data.name,
          userEmail: parsed.data.email || tenantForManualAccess?.billingEmail || "",
        });
      }

      return user;
    });

    await createAuditLog({
      action: "platform.manual_user_created",
      targetType: "user",
      targetId: createdUser.id,
      tenantId: tenantId ?? undefined,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        email: createdUser.email,
        tenantId,
        tenantRole: tenantId ? parsed.data.tenantRole : null,
        membershipStatus: tenantId ? parsed.data.membershipStatus : null,
        businessAccess: tenantId ? parsed.data.businessAccess : null,
        labsAccess: tenantId ? parsed.data.labsAccess : null,
        emailVerifiedByAdmin: true,
        forcePasswordChange: parsed.data.forcePasswordChange,
      },
    });

    revalidatePath("/app/admin/users");
    revalidatePath("/app/admin");
    revalidatePath("/app");
    return { success: "Cuenta creada sin verificacion por email." };
  } catch {
    return { error: "No pudimos crear la cuenta manual." };
  }
}

export async function updateInternalAvailabilityByAdminAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = updateInternalAvailabilitySchema.safeParse({
      userId: formData.get("userId"),
      availability: formData.get("availability"),
    });
    if (!parsed.success) return { error: "Estado de disponibilidad invalido." };

    const current = await prisma.internalUserProfile.findUnique({
      where: { userId: parsed.data.userId },
      select: { availability: true },
    });
    if (!current) return { error: "Perfil interno no encontrado." };

    await prisma.$transaction(async (tx) => {
      await tx.internalUserProfile.update({
        where: { userId: parsed.data.userId },
        data: { availability: parsed.data.availability },
      });
      await tx.availabilityLog.create({
        data: {
          userId: parsed.data.userId,
          actorUserId: adminSession.user.id,
          previousStatus: current.availability,
          nextStatus: parsed.data.availability,
          changedBy: "ADMIN",
        },
      });
    });

    await createAuditLog({
      action: "platform.internal_availability_updated",
      targetType: "internal_user_profile",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
      metadata: {
        before: current.availability,
        after: parsed.data.availability,
      },
    });

    revalidatePath("/app/admin");
    revalidatePath("/app/support");
    return { success: "Disponibilidad actualizada." };
  } catch {
    return { error: "No pudimos actualizar disponibilidad." };
  }
}

export async function updateUserStatusAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.USERS);
    const parsed = updateUserStatusSchema.safeParse({
      userId: formData.get("userId"),
      isDisabled: formData.get("isDisabled") === "true",
      disabledReason: sanitizeNullableText(String(formData.get("disabledReason") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "No pudimos validar el estado del usuario." };

    const previousUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { isDisabled: true, disabledReason: true, disabledAt: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parsed.data.userId },
        data: {
          isDisabled: parsed.data.isDisabled,
          disabledAt: parsed.data.isDisabled ? new Date() : null,
          disabledReason: parsed.data.isDisabled ? parsed.data.disabledReason ?? "Desactivado por administrador." : null,
        },
      });
      if (parsed.data.isDisabled) {
        await tx.session.deleteMany({ where: { userId: parsed.data.userId } });
      }
    });

    await createAuditLog({
      action: parsed.data.isDisabled ? "platform.user_disabled" : "platform.user_reenabled",
      targetType: "user",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
      metadata: {
        before: previousUser,
        after: {
          isDisabled: parsed.data.isDisabled,
          disabledReason: parsed.data.isDisabled ? parsed.data.disabledReason ?? "Desactivado por administrador." : null,
        },
      },
    });
    revalidatePath("/app/admin");
    revalidatePath("/app/admin/users");
    return { success: parsed.data.isDisabled ? "Usuario desactivado." : "Usuario reactivado." };
  } catch {
    return { error: "No pudimos actualizar el estado del usuario." };
  }
}

export type AdminPasswordResetActionState = AdminGovernanceActionState & {
  generatedPassword?: string;
};

export async function resetUserPasswordByAdminAction(
  _: AdminPasswordResetActionState,
  formData: FormData,
): Promise<AdminPasswordResetActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.USERS);
    const parsed = resetUserPasswordSchema.safeParse({
      userId: formData.get("userId"),
    });
    if (!parsed.success) return { error: "Usuario invalido para reset." };
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parsed.data.userId },
        data: {
          passwordHash,
          forcePasswordChange: true,
          tempPasswordIssuedAt: new Date(),
          passwordChangedAt: new Date(),
        },
      });
      await tx.session.deleteMany({ where: { userId: parsed.data.userId } });
    });

    await createAuditLog({
      action: "platform.user_password_reset_by_admin",
      targetType: "user",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin");
    return {
      success: "Contrasena temporal generada. Copiala ahora.",
      generatedPassword: tempPassword,
    };
  } catch {
    return { error: "No pudimos resetear la contrasena." };
  }
}

export async function updateTenantBillingSnapshotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.BILLING);
    const parsed = updateBillingSnapshotSchema.safeParse({
      tenantId: formData.get("tenantId"),
      paidAt: String(formData.get("paidAt") ?? "").trim() || undefined,
      nextBillingAt: String(formData.get("nextBillingAt") ?? "").trim() || undefined,
      hostingEndsAt: String(formData.get("hostingEndsAt") ?? "").trim() || undefined,
      maintenanceEndsAt: String(formData.get("maintenanceEndsAt") ?? "").trim() || undefined,
      cancelPlan: formData.get("cancelPlan") === "true",
      cancelReason: sanitizeNullableText(String(formData.get("cancelReason") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Datos de billing invalidos." };

    const previousSubscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId: parsed.data.tenantId },
      select: {
        paidAt: true,
        nextBillingAt: true,
        hostingEndsAt: true,
        maintenanceEndsAt: true,
        billingStatus: true,
        canceledAt: true,
        cancelReason: true,
      },
    });

    await prisma.tenantSubscription.upsert({
      where: { tenantId: parsed.data.tenantId },
      update: {
        paidAt: toNullableDate(parsed.data.paidAt ?? ""),
        nextBillingAt: toNullableDate(parsed.data.nextBillingAt ?? ""),
        hostingEndsAt: toNullableDate(parsed.data.hostingEndsAt ?? ""),
        maintenanceEndsAt: toNullableDate(parsed.data.maintenanceEndsAt ?? ""),
        canceledAt: parsed.data.cancelPlan ? new Date() : null,
        cancelReason: parsed.data.cancelPlan ? parsed.data.cancelReason ?? "Cancelado por administrador." : null,
        canceledByUserId: parsed.data.cancelPlan ? adminSession.user.id : null,
        billingStatus: parsed.data.cancelPlan ? "CANCELED" : undefined,
      },
      create: {
        tenantId: parsed.data.tenantId,
        paidAt: toNullableDate(parsed.data.paidAt ?? ""),
        nextBillingAt: toNullableDate(parsed.data.nextBillingAt ?? ""),
        hostingEndsAt: toNullableDate(parsed.data.hostingEndsAt ?? ""),
        maintenanceEndsAt: toNullableDate(parsed.data.maintenanceEndsAt ?? ""),
        canceledAt: parsed.data.cancelPlan ? new Date() : null,
        cancelReason: parsed.data.cancelPlan ? parsed.data.cancelReason ?? "Cancelado por administrador." : null,
        canceledByUserId: parsed.data.cancelPlan ? adminSession.user.id : null,
        billingStatus: parsed.data.cancelPlan ? "CANCELED" : "TRIAL",
      },
    });

    await createAuditLog({
      action: "platform.tenant_billing_snapshot_updated",
      targetType: "tenant_subscription",
      targetId: parsed.data.tenantId,
      actorUserId: adminSession.user.id,
      metadata: {
        before: previousSubscription,
        after: {
          paidAt: parsed.data.paidAt ?? null,
          nextBillingAt: parsed.data.nextBillingAt ?? null,
          hostingEndsAt: parsed.data.hostingEndsAt ?? null,
          maintenanceEndsAt: parsed.data.maintenanceEndsAt ?? null,
          cancelPlan: parsed.data.cancelPlan ?? false,
          cancelReason: parsed.data.cancelReason ?? null,
        },
      },
    });
    revalidatePath("/app/admin");
    return { success: "Snapshot de billing actualizado." };
  } catch {
    return { error: "No pudimos actualizar billing." };
  }
}

export async function createAdminNotificationAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.NOTIFICATIONS);
    const parsed = createAdminNotificationSchema.safeParse({
      title: sanitizeText(String(formData.get("title") ?? "")),
      message: sanitizeText(String(formData.get("message") ?? "")),
      tone: formData.get("tone"),
      category: formData.get("category"),
      target: formData.get("target"),
      tenantId: String(formData.get("tenantId") ?? "").trim() || undefined,
      targetRole: (String(formData.get("targetRole") ?? "").trim() || undefined) as "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER" | undefined,
      targetUserIds: String(formData.get("targetUserIds") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
      startsAt: String(formData.get("startsAt") ?? "").trim() || undefined,
      endsAt: String(formData.get("endsAt") ?? "").trim() || undefined,
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return { error: "No pudimos validar la notificacion." };

    const createdNotification = await prisma.adminNotification.create({
      data: {
        title: parsed.data.title,
        message: parsed.data.message,
        tone: parsed.data.tone,
        category: parsed.data.category,
        target: parsed.data.target,
        tenantId: parsed.data.tenantId ?? null,
        targetRole: parsed.data.targetRole ?? null,
        targetUserIds: parsed.data.targetUserIds,
        startsAt: toNullableDate(parsed.data.startsAt ?? ""),
        endsAt: toNullableDate(parsed.data.endsAt ?? ""),
        isActive: parsed.data.isActive,
        createdByUserId: adminSession.user.id,
      },
    });

    await createAuditLog({
      action: "platform.admin_notification_created",
      targetType: "admin_notification",
      targetId: createdNotification.id,
      actorUserId: adminSession.user.id,
      metadata: {
        before: null,
        after: {
          title: createdNotification.title,
          target: createdNotification.target,
          tone: createdNotification.tone,
          category: createdNotification.category,
          tenantId: createdNotification.tenantId,
          targetRole: createdNotification.targetRole,
          targetUserIds: createdNotification.targetUserIds,
        },
      },
    });
    revalidatePath("/app/admin");
    revalidatePath("/app");
    return { success: "Notificacion creada." };
  } catch {
    return { error: "No pudimos crear la notificacion." };
  }
}

export async function createWikiDocumentAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = createWikiDocumentSchema.safeParse({
      title: sanitizeText(String(formData.get("title") ?? "")),
      slug: sanitizeText(String(formData.get("slug") ?? "")),
      summary: sanitizeNullableText(String(formData.get("summary") ?? "")) ?? undefined,
      status: formData.get("status"),
      sectionTitle: sanitizeText(String(formData.get("sectionTitle") ?? "")),
      sectionBody: sanitizeText(String(formData.get("sectionBody") ?? "")),
    });
    if (!parsed.success) return { error: "Revisa los campos de wiki/documentacion." };

    const doc = await prisma.wikiDocument.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        summary: parsed.data.summary ?? null,
        status: parsed.data.status,
        createdByUserId: adminSession.user.id,
        sections: {
          create: {
            title: parsed.data.sectionTitle,
            body: parsed.data.sectionBody,
            sortOrder: 0,
          },
        },
      },
    });

    await prisma.wikiRevision.create({
      data: {
        documentId: doc.id,
        changedByUserId: adminSession.user.id,
        summary: "Documento inicial creado desde Master Admin.",
        snapshot: {
          title: parsed.data.title,
          slug: parsed.data.slug,
          sectionTitle: parsed.data.sectionTitle,
        },
      },
    });
    revalidatePath("/app/admin");
    revalidatePath("/developers/docs");
    return { success: "Documento wiki creado correctamente." };
  } catch {
    return { error: "No pudimos crear el documento wiki." };
  }
}

export async function upsertFaqItemByAdminAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.FAQS);
    const parsed = upsertFaqItemSchema.safeParse({
      id: String(formData.get("id") ?? "").trim() || undefined,
      question: sanitizeText(String(formData.get("question") ?? "")),
      answer: sanitizeText(String(formData.get("answer") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return { error: "Datos invalidos para FAQ." };

    const payload = {
      tenantId: null,
      question: parsed.data.question,
      answer: parsed.data.answer,
      category: parsed.data.category ?? null,
      tags: parsed.data.tags,
      isActive: parsed.data.isActive,
      createdByUserId: adminSession.user.id,
    };

    if (parsed.data.id) {
      await prisma.supportKnowledgeItem.update({
        where: { id: parsed.data.id },
        data: {
          question: payload.question,
          answer: payload.answer,
          category: payload.category,
          tags: payload.tags,
          isActive: payload.isActive,
        },
      });
    } else {
      await prisma.supportKnowledgeItem.create({ data: payload });
    }

    await createAuditLog({
      action: parsed.data.id ? "platform.faq_updated" : "platform.faq_created",
      targetType: "support_knowledge_item",
      targetId: parsed.data.id,
      actorUserId: adminSession.user.id,
      metadata: { category: parsed.data.category ?? null },
    });
    revalidatePath("/app/admin/faqs");
    revalidatePath("/app/admin/support");
    return { success: parsed.data.id ? "FAQ actualizada." : "FAQ creada." };
  } catch {
    return { error: "No pudimos guardar la FAQ." };
  }
}

export async function deleteFaqItemByAdminAction(formData: FormData): Promise<void> {
  const adminSession = await requireAdminPermission(adminPermissions.FAQS);
  const parsed = deleteFaqItemSchema.safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) return;

  await prisma.supportKnowledgeItem.delete({ where: { id: parsed.data.id } });
  await createAuditLog({
    action: "platform.faq_deleted",
    targetType: "support_knowledge_item",
    targetId: parsed.data.id,
    actorUserId: adminSession.user.id,
  });
  revalidatePath("/app/admin/faqs");
  revalidatePath("/app/admin/support");
}

export async function updateWikiDocumentMetaAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.WIKI);
    const parsed = updateWikiDocumentMetaSchema.safeParse({
      documentId: formData.get("documentId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      slug: sanitizeText(String(formData.get("slug") ?? "")),
      summary: sanitizeNullableText(String(formData.get("summary") ?? "")) ?? undefined,
      status: formData.get("status"),
    });
    if (!parsed.success) return { error: "Datos invalidos para actualizar documentacion." };

    const previousDocument = await prisma.wikiDocument.findUnique({
      where: { id: parsed.data.documentId },
      select: { title: true, slug: true, summary: true, status: true },
    });

    await prisma.wikiDocument.update({
      where: { id: parsed.data.documentId },
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        summary: parsed.data.summary ?? null,
        status: parsed.data.status,
      },
    });
    await prisma.wikiRevision.create({
      data: {
        documentId: parsed.data.documentId,
        changedByUserId: adminSession.user.id,
        summary: "Metadatos de documento actualizados.",
        snapshot: parsed.data,
      },
    });
    await createAuditLog({
      action: "platform.wiki_document_meta_updated",
      targetType: "wiki_document",
      targetId: parsed.data.documentId,
      actorUserId: adminSession.user.id,
      metadata: {
        before: previousDocument,
        after: {
          title: parsed.data.title,
          slug: parsed.data.slug,
          summary: parsed.data.summary ?? null,
          status: parsed.data.status,
        },
      },
    });
    revalidatePath("/app/admin/wiki");
    revalidatePath(`/developers/docs/${parsed.data.slug}`);
    revalidatePath("/developers/docs");
    return { success: "Documento actualizado." };
  } catch {
    return { error: "No pudimos actualizar el documento." };
  }
}

export async function addWikiSectionAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.WIKI);
    const parsed = addWikiSectionSchema.safeParse({
      documentId: formData.get("documentId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      body: sanitizeText(String(formData.get("body") ?? "")),
    });
    if (!parsed.success) return { error: "Seccion invalida." };

    const lastSection = await prisma.wikiSection.findFirst({
      where: { documentId: parsed.data.documentId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await prisma.wikiSection.create({
      data: {
        documentId: parsed.data.documentId,
        title: parsed.data.title,
        body: parsed.data.body,
        sortOrder: (lastSection?.sortOrder ?? -1) + 1,
      },
    });
    await createAuditLog({
      action: "platform.wiki_section_added",
      targetType: "wiki_document",
      targetId: parsed.data.documentId,
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin/wiki");
    return { success: "Seccion agregada." };
  } catch {
    return { error: "No pudimos agregar la seccion." };
  }
}

export async function addWikiStepAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.WIKI);
    const parsed = addWikiStepSchema.safeParse({
      sectionId: formData.get("sectionId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      content: sanitizeText(String(formData.get("content") ?? "")),
    });
    if (!parsed.success) return { error: "Paso invalido." };

    const lastStep = await prisma.wikiStep.findFirst({
      where: { sectionId: parsed.data.sectionId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await prisma.wikiStep.create({
      data: {
        sectionId: parsed.data.sectionId,
        title: parsed.data.title,
        content: parsed.data.content,
        sortOrder: (lastStep?.sortOrder ?? -1) + 1,
      },
    });
    await createAuditLog({
      action: "platform.wiki_step_added",
      targetType: "wiki_section",
      targetId: parsed.data.sectionId,
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin/wiki");
    return { success: "Paso agregado." };
  } catch {
    return { error: "No pudimos agregar el paso." };
  }
}

export async function addWikiDiscussionAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.WIKI);
    const parsed = addWikiDiscussionSchema.safeParse({
      sectionId: formData.get("sectionId"),
      content: sanitizeText(String(formData.get("content") ?? "")),
    });
    if (!parsed.success) return { error: "Discusion invalida." };

    await prisma.wikiDiscussion.create({
      data: {
        sectionId: parsed.data.sectionId,
        content: parsed.data.content,
        authorName: adminSession.user.name ?? adminSession.user.email ?? "Admin",
      },
    });
    await createAuditLog({
      action: "platform.wiki_discussion_added",
      targetType: "wiki_section",
      targetId: parsed.data.sectionId,
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin/wiki");
    return { success: "Discusion agregada." };
  } catch {
    return { error: "No pudimos agregar la discusion." };
  }
}

export async function updateAdminAccessPolicyAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = updateAdminAccessPolicySchema.safeParse({
      userId: formData.get("userId"),
      canManageUsers: formData.get("canManageUsers") === "on",
      canManageModules: formData.get("canManageModules") === "on",
      canManageBilling: formData.get("canManageBilling") === "on",
      canManageFaqs: formData.get("canManageFaqs") === "on",
      canManageWiki: formData.get("canManageWiki") === "on",
      canViewAudit: formData.get("canViewAudit") === "on",
      canManageNotifications: formData.get("canManageNotifications") === "on",
    });
    if (!parsed.success) return { error: "Politica invalida." };

    const previousPolicy = await prisma.adminAccessPolicy.findUnique({
      where: { userId: parsed.data.userId },
    });

    const savedPolicy = await prisma.adminAccessPolicy.upsert({
      where: { userId: parsed.data.userId },
      update: {
        canManageUsers: parsed.data.canManageUsers,
        canManageModules: parsed.data.canManageModules,
        canManageBilling: parsed.data.canManageBilling,
        canManageFaqs: parsed.data.canManageFaqs,
        canManageWiki: parsed.data.canManageWiki,
        canViewAudit: parsed.data.canViewAudit,
        canManageNotifications: parsed.data.canManageNotifications,
      },
      create: {
        userId: parsed.data.userId,
        canManageUsers: parsed.data.canManageUsers,
        canManageModules: parsed.data.canManageModules,
        canManageBilling: parsed.data.canManageBilling,
        canManageFaqs: parsed.data.canManageFaqs,
        canManageWiki: parsed.data.canManageWiki,
        canViewAudit: parsed.data.canViewAudit,
        canManageNotifications: parsed.data.canManageNotifications,
      },
    });

    await createAuditLog({
      action: "platform.admin_access_policy_updated",
      targetType: "admin_access_policy",
      targetId: savedPolicy.id,
      actorUserId: adminSession.user.id,
      metadata: {
        before: previousPolicy,
        after: savedPolicy,
      },
    });
    revalidatePath("/app/admin");
    return { success: "Permisos admin actualizados." };
  } catch {
    return { error: "No pudimos guardar los permisos admin." };
  }
}

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createDevTaskAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const session = await requireVerifiedUser();
    if (session.user.platformRole !== "SUPER_ADMIN") {
      return { error: "Solo Admin Master puede crear tareas." };
    }
    const parsed = createDevTaskSchema.safeParse({
      title: sanitizeText(String(formData.get("title") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      tenantId: String(formData.get("tenantId") ?? "").trim() || undefined,
      clientAccountId: String(formData.get("clientAccountId") ?? "").trim() || undefined,
      projectReference: sanitizeNullableText(String(formData.get("projectReference") ?? "")) ?? undefined,
      taskType: formData.get("taskType"),
      priority: formData.get("priority"),
      status: formData.get("status"),
      assignedToUserId: String(formData.get("assignedToUserId") ?? "").trim() || undefined,
      dueAt: String(formData.get("dueAt") ?? "").trim() || undefined,
    });
    if (!parsed.success) return { error: "Datos invalidos para crear tarea." };

    const created = await prisma.devTask.create({
      data: {
        tenantId: parsed.data.tenantId ?? null,
        title: parsed.data.title,
        description: parsed.data.description,
        clientAccountId: parsed.data.clientAccountId ?? null,
        projectReference: parsed.data.projectReference ?? null,
        taskType: parsed.data.taskType,
        priority: parsed.data.priority,
        status: parsed.data.status,
        assignedToUserId: parsed.data.assignedToUserId ?? null,
        createdByUserId: session.user.id,
        dueAt: parseOptionalDate(parsed.data.dueAt),
      },
    });

    await prisma.devTaskHistory.create({
      data: {
        taskId: created.id,
        actorUserId: session.user.id,
        action: "TASK_CREATED",
        beforeJson: undefined,
        afterJson: {
          title: created.title,
          status: created.status,
          priority: created.priority,
          assignee: created.assignedToUserId,
        },
      },
    });

    await createAuditLog({
      action: "platform.dev_task_created",
      targetType: "dev_task",
      targetId: created.id,
      actorUserId: session.user.id,
      metadata: {
        after: {
          title: created.title,
          status: created.status,
          priority: created.priority,
        },
      },
    });
    await createAutoAdminNotification({
      title: "Nueva tarea asignada",
      message: `Se creÃ³ la tarea "${created.title}" con prioridad ${created.priority}.`,
      category: "platform",
      tone: created.priority === "URGENT" ? "danger" : "info",
      targetRole: created.assignedToUserId ? "DEVELOPER" : "SUPER_ADMIN",
      tenantId: created.tenantId,
    });
    revalidatePath("/app/admin/development");
    revalidatePath("/app/developer");
    return { success: "Tarea creada correctamente." };
  } catch {
    return { error: "No pudimos crear la tarea." };
  }
}

export async function updateDevTaskAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const session = await requireVerifiedUser();
    const parsed = updateDevTaskSchema.safeParse({
      taskId: formData.get("taskId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      taskType: formData.get("taskType"),
      priority: formData.get("priority"),
      status: formData.get("status"),
      assignedToUserId: String(formData.get("assignedToUserId") ?? "").trim() || undefined,
      dueAt: String(formData.get("dueAt") ?? "").trim() || undefined,
    });
    if (!parsed.success) return { error: "Datos invalidos para actualizar tarea." };

    const current = await prisma.devTask.findUnique({
      where: { id: parsed.data.taskId },
      select: {
        assignedToUserId: true,
        status: true,
        priority: true,
        title: true,
        description: true,
        taskType: true,
        dueAt: true,
      },
    });
    if (!current) return { error: "Tarea no encontrada." };

    if (
      session.user.platformRole === "DEVELOPER" &&
      (await prisma.devTask.count({
        where: { id: parsed.data.taskId, assignedToUserId: session.user.id },
      })) === 0
    ) {
      return { error: "No puedes editar tareas no asignadas a tu usuario." };
    }

    const updated = await prisma.devTask.update({
      where: { id: parsed.data.taskId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        taskType: parsed.data.taskType,
        priority: parsed.data.priority,
        status: parsed.data.status,
        assignedToUserId:
          session.user.platformRole === "SUPER_ADMIN" ? (parsed.data.assignedToUserId ?? null) : undefined,
        dueAt: parseOptionalDate(parsed.data.dueAt),
        completedAt: parsed.data.status === "COMPLETED" ? new Date() : null,
      },
    });

    if (
      session.user.platformRole === "SUPER_ADMIN" &&
      current.assignedToUserId !== (parsed.data.assignedToUserId ?? null)
    ) {
      await prisma.devTaskAssignmentHistory.create({
        data: {
          taskId: updated.id,
          previousUserId: current.assignedToUserId,
          nextUserId: parsed.data.assignedToUserId ?? null,
          changedByUserId: session.user.id,
        },
      });
    }

    await prisma.devTaskHistory.create({
      data: {
        taskId: updated.id,
        actorUserId: session.user.id,
        action: "TASK_UPDATED",
        beforeJson: current,
        afterJson: {
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          assignee: updated.assignedToUserId,
        },
      },
    });

    await createAuditLog({
      action: "platform.dev_task_updated",
      targetType: "dev_task",
      targetId: updated.id,
      actorUserId: session.user.id,
      metadata: {
        before: current,
        after: {
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          assignedToUserId: updated.assignedToUserId,
        },
      },
    });
    if (updated.status === "BLOCKED") {
      await createAutoAdminNotification({
        title: "Tarea bloqueada",
        message: `La tarea "${updated.title}" fue marcada como bloqueada.`,
        category: "platform",
        tone: "warning",
        targetRole: "SUPER_ADMIN",
        tenantId: updated.tenantId,
      });
    }
    if (updated.dueAt && updated.status !== "COMPLETED" && updated.status !== "CANCELED" && updated.dueAt < new Date()) {
      await createAutoAdminNotification({
        title: "Tarea vencida",
        message: `La tarea "${updated.title}" estÃ¡ vencida y sigue activa.`,
        category: "platform",
        tone: "danger",
        targetRole: "SUPER_ADMIN",
        tenantId: updated.tenantId,
      });
    }

    revalidatePath("/app/admin/development");
    revalidatePath("/app/developer");
    return { success: "Tarea actualizada." };
  } catch {
    return { error: "No pudimos actualizar la tarea." };
  }
}

export async function addDevTaskCommentAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const session = await requireVerifiedUser();
    const parsed = addDevTaskCommentSchema.safeParse({
      taskId: formData.get("taskId"),
      body: sanitizeText(String(formData.get("body") ?? "")),
    });
    if (!parsed.success) return { error: "Comentario invalido." };

    const task = await prisma.devTask.findUnique({
      where: { id: parsed.data.taskId },
      select: { assignedToUserId: true },
    });
    if (!task) return { error: "Tarea no encontrada." };
    if (
      session.user.platformRole === "DEVELOPER" &&
      task.assignedToUserId !== session.user.id
    ) {
      return { error: "No puedes comentar tareas de otros usuarios." };
    }

    await prisma.devTaskComment.create({
      data: {
        taskId: parsed.data.taskId,
        authorUserId: session.user.id,
        body: parsed.data.body,
      },
    });
    await prisma.devTaskHistory.create({
      data: {
        taskId: parsed.data.taskId,
        actorUserId: session.user.id,
        action: "COMMENT_ADDED",
        afterJson: { body: parsed.data.body },
      },
    });
    revalidatePath("/app/admin/development");
    revalidatePath("/app/developer");
    return { success: "Comentario agregado." };
  } catch {
    return { error: "No pudimos agregar el comentario." };
  }
}

export async function addDevTaskAttachmentAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const session = await requireVerifiedUser();
    const taskId = String(formData.get("taskId") ?? "");
    const file = formData.get("file");

    if (!taskId) return { error: "Tarea invalida para adjuntar archivo." };
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Selecciona un archivo valido." };
    }

    const task = await prisma.devTask.findUnique({
      where: { id: taskId },
      select: { assignedToUserId: true },
    });
    if (!task) return { error: "Tarea no encontrada." };

    if (
      session.user.platformRole === "DEVELOPER" &&
      task.assignedToUserId !== session.user.id
    ) {
      return { error: "No puedes adjuntar archivos a tareas no asignadas a tu usuario." };
    }

    if (session.user.platformRole !== "DEVELOPER" && session.user.platformRole !== "SUPER_ADMIN") {
      return { error: "Rol sin permisos para adjuntar archivos." };
    }

    const metadata = await validateUpload(file);
    const buffer = new Uint8Array(await file.arrayBuffer());
    const relativePath = `internal/dev-tasks/${taskId}/${Date.now()}-${randomUUID()}-${metadata.originalName}`;
    const stored = await saveLocalUpload({
      relativePath,
      bytes: buffer,
    });

    const attachment = await prisma.devTaskAttachment.create({
      data: {
        taskId,
        fileName: metadata.originalName,
        mimeType: metadata.type,
        sizeBytes: metadata.size,
        storagePath: stored.relativePath,
        uploadedById: session.user.id,
      },
    });

    await prisma.devTaskHistory.create({
      data: {
        taskId,
        actorUserId: session.user.id,
        action: "ATTACHMENT_ADDED",
        afterJson: {
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        },
      },
    });

    await createAuditLog({
      action: "platform.dev_task_attachment_added",
      targetType: "dev_task_attachment",
      targetId: attachment.id,
      actorUserId: session.user.id,
      metadata: {
        taskId,
        fileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
      },
    });

    revalidatePath("/app/admin/development");
    revalidatePath("/app/developer");
    return { success: "Adjunto subido correctamente." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FILE_TOO_LARGE") return { error: "Archivo demasiado grande." };
      if (error.message === "FILE_EXTENSION_NOT_ALLOWED") return { error: "Extension no permitida." };
      if (error.message === "FILE_TYPE_NOT_ALLOWED") return { error: "Tipo de archivo no permitido." };
      if (error.message === "FILE_SIGNATURE_INVALID") return { error: "El archivo no coincide con su tipo declarado." };
      if (error.message === "FILE_MALWARE_DETECTED") return { error: "Se detecto contenido malicioso en el archivo." };
    }

    return { error: "No pudimos adjuntar el archivo." };
  }
}

export async function deletePlatformUpdateFormAction(formData: FormData): Promise<void> {
  await deletePlatformUpdateAction({}, formData);
}

export async function enableCustomProjectMeetingAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const requestId = String(formData.get("requestId") ?? "");
    const meetingType = String(formData.get("meetingType") ?? "");
    if (!requestId || !meetingType) return { error: "Datos incompletos para habilitar la reunion." };
    if (!customProjectMeetingTypes.has(meetingType as CustomProjectMeetingTypeInput)) {
      return { error: "Tipo de reunion invalido." };
    }

    await prisma.customProjectMeeting.upsert({
      where: {
        customPageRequestId_type: {
          customPageRequestId: requestId,
          type: meetingType as CustomProjectMeetingTypeInput,
        },
      },
      update: {
        isEnabledByAdmin: true,
        status: "ENABLED",
      },
      create: {
        customPageRequestId: requestId,
        tenantId: String(formData.get("tenantId") ?? ""),
        type: meetingType as CustomProjectMeetingTypeInput,
        isEnabledByAdmin: true,
        status: "ENABLED",
      },
    });
    await createAuditLog({
      action: "platform.custom_project_meeting_enabled",
      targetType: "custom_project_meeting",
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner/customizations");
    return { success: "Reunion habilitada para el cliente." };
  } catch {
    return { error: "No pudimos habilitar la reunion." };
  }
}

export async function createMeetingAvailabilitySlotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createMeetingAvailabilitySlotSchema.safeParse({
      tenantId: formData.get("tenantId"),
      startsAt: String(formData.get("startsAt") ?? ""),
      endsAt: String(formData.get("endsAt") ?? ""),
      durationMinutes: formData.get("durationMinutes"),
      capacity: formData.get("capacity"),
      notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Datos de agenda invalidos." };

    const startsAt = parseBuenosAiresDateTimeLocal(parsed.data.startsAt);
    const endsAt = parseBuenosAiresDateTimeLocal(parsed.data.endsAt);

    if (endsAt <= startsAt) {
      return { error: "El horario de fin debe ser mayor al de inicio." };
    }

    const createdSlot = await prisma.meetingAvailabilitySlot.create({
      data: {
        tenantId: parsed.data.tenantId,
        startsAt,
        endsAt,
        durationMinutes: parsed.data.durationMinutes,
        capacity: parsed.data.capacity,
        notes: parsed.data.notes ?? null,
        createdByUserId: adminSession.user.id,
        updatedByUserId: adminSession.user.id,
      },
      include: {
        tenant: {
          select: {
            id: true,
            accountName: true,
          },
        },
      },
    });

    revalidatePath("/app/admin/customizations");
    return {
      success: "Slot de agenda creado.",
      createdSlot: {
        id: createdSlot.id,
        startsAt: createdSlot.startsAt.toISOString(),
        endsAt: createdSlot.endsAt.toISOString(),
        capacity: createdSlot.capacity,
        reservedCount: createdSlot.reservedCount,
        tenant: createdSlot.tenant,
      },
    };
  } catch {
    return { error: "No pudimos crear el slot." };
  }
}

export async function updateMeetingAvailabilitySlotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = updateMeetingAvailabilitySlotSchema.safeParse({
      slotId: formData.get("slotId"),
      isActive:
        formData.get("isActive") == null
          ? undefined
          : String(formData.get("isActive")) === "true",
      startsAt: String(formData.get("startsAt") ?? ""),
      endsAt: String(formData.get("endsAt") ?? ""),
      durationMinutes: formData.get("durationMinutes"),
      capacity: formData.get("capacity"),
      notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Datos de slot invalidos." };

    await prisma.meetingAvailabilitySlot.update({
      where: { id: parsed.data.slotId },
      data: {
        isActive: parsed.data.isActive,
        startsAt: parsed.data.startsAt ? parseBuenosAiresDateTimeLocal(parsed.data.startsAt) : undefined,
        endsAt: parsed.data.endsAt ? parseBuenosAiresDateTimeLocal(parsed.data.endsAt) : undefined,
        durationMinutes: parsed.data.durationMinutes,
        capacity: parsed.data.capacity,
        notes: parsed.data.notes ?? undefined,
        updatedByUserId: adminSession.user.id,
      },
    });
    revalidatePath("/app/admin/customizations");
    return { success: "Slot actualizado." };
  } catch {
    return { error: "No pudimos actualizar el slot." };
  }
}

export async function deleteMeetingAvailabilitySlotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const slotId = String(formData.get("slotId") ?? "");
    if (!slotId) return { error: "Falta el horario a eliminar." };

    const slot = await prisma.meetingAvailabilitySlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!slot) {
      return { error: "Ese horario ya no existe." };
    }

    await prisma.meetingAvailabilitySlot.update({
      where: { id: slot.id },
      data: {
        isActive: false,
        updatedByUserId: adminSession.user.id,
      },
    });

    await createAuditLog({
      action: "platform.custom_project_slot_deleted",
      targetType: "meeting_availability_slot",
      targetId: slot.id,
      tenantId: slot.tenantId,
      actorUserId: adminSession.user.id,
    });

    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner/customizations");
    return { success: "Horario eliminado.", deletedSlotId: slot.id };
  } catch {
    return { error: "No pudimos eliminar el horario." };
  }
}

export async function setCustomProjectMeetingLinkAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = setCustomMeetingLinkSchema.safeParse({
      requestId: formData.get("requestId"),
      meetingType: formData.get("meetingType"),
      meetingUrl: String(formData.get("meetingUrl") ?? ""),
    });
    if (!parsed.success) return { error: "Link de reunion invalido." };

    await prisma.customProjectMeeting.update({
      where: {
        customPageRequestId_type: {
          customPageRequestId: parsed.data.requestId,
          type: parsed.data.meetingType,
        },
      },
      data: {
        meetingUrl: parsed.data.meetingUrl,
      },
    });

    await prisma.customProjectMeetingBooking.updateMany({
      where: { customPageRequestId: parsed.data.requestId },
      data: { meetingUrl: parsed.data.meetingUrl },
    });

    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/business");
    revalidatePath("/app");
    return { success: "Link de reunion actualizado." };
  } catch {
    return { error: "No pudimos actualizar el link de reunion." };
  }
}

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

export async function provisionCustomProjectAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  const startedAt = Date.now();
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = provisionCustomProjectSchema.safeParse({
      requestId: formData.get("requestId"),
      tenantId: formData.get("tenantId"),
      pageName: sanitizeText(String(formData.get("pageName") ?? "")),
      repositoryUrl: sanitizeNullableText(String(formData.get("repositoryUrl") ?? "")) ?? "",
      deployNotes: sanitizeNullableText(String(formData.get("deployNotes") ?? "")) ?? undefined,
    });
    if (!parsed.success) {
      return {
        error: "Revisa nombre de pagina, URL del repositorio y notas.",
        durationMs: Date.now() - startedAt,
      };
    }
    const projectZip = formData.get("projectZip");

    const request = await prisma.customPageRequest.findFirst({
      where: {
        id: parsed.data.requestId,
        tenantId: parsed.data.tenantId,
      },
      include: {
        tenant: {
          select: {
            accountName: true,
            subscription: {
              select: {
                plan: true,
                premiumEnabled: true,
              },
            },
            storefrontPages: {
              select: {
                id: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      return {
        error: "No encontramos la solicitud personalizada.",
        durationMs: Date.now() - startedAt,
      };
    }
    const baseAccountSlug = normalizeCustomProjectSlug(request.tenant.accountName);
    const usedSlugs = request.tenant.storefrontPages
      .filter((page) => page.id !== request.storefrontPageId)
      .map((page) => page.slug.toLowerCase());
    if (usedSlugs.includes(baseAccountSlug)) {
      return {
        error:
          "El subdominio base del usuario ya esta usado por otra pagina. Libera esa pagina o cambia accountName para usar nombredelusuario.vase.ar.",
      };
    }
    const defaultSlug = resolveCustomProjectSlug(request.tenant.accountName, []);
    let builderDocument = createInitialBuilderDocument("CATALOG");
    let uploadedPackageMeta: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      packageSha256?: string;
      storagePath: string;
      extractedPath?: string;
      fileCount?: number;
      totalBytes?: number;
      repositoryUrl?: string | null;
      uploadedAt: string;
      uploadedByUserId: string;
      source: "custom_project_provision" | "custom_project_github";
    } | null = null;
    let packageSourceType: CustomSitePackageSource = "generic";
    let zipPackage: {
      bytes: Uint8Array;
      sha256: string;
      sizeBytes: number;
      fileName: string;
      mimeType: string;
    } | null = null;

    if (projectZip instanceof File && projectZip.size > 0) {
      try {
        zipPackage = await validateModuleZip(projectZip);
        packageSourceType = "zip";
      } catch (error) {
        return { error: describeCustomSitePackageError(error), durationMs: Date.now() - startedAt };
      }
    } else if (parsed.data.repositoryUrl) {
      try {
        const githubZip = await downloadGithubRepositoryZip(parsed.data.repositoryUrl);
        zipPackage = validateDownloadedZip(githubZip.bytes, githubZip.fileName);
        packageSourceType = "github";
      } catch (error) {
        return { error: describeCustomSitePackageError(error), durationMs: Date.now() - startedAt };
      }
    }

    if (zipPackage) {
      try {
        const relativePath = `business/custom-project-packages/${request.tenantId}/${Date.now()}-${randomUUID()}-${zipPackage.fileName}`;
        const [stored, extracted] = await Promise.all([
          saveLocalUpload({ relativePath, bytes: zipPackage.bytes }),
          extractCustomSitePackage({
            siteId: request.id,
            zipBytes: zipPackage.bytes,
          }),
        ]);
        const customStaticSite = createCustomStaticSiteManifest({
          siteId: request.id,
          sourceType: packageSourceType,
          repositoryUrl: parsed.data.repositoryUrl || null,
          packageFileName: zipPackage.fileName,
          zipBytes: zipPackage.bytes,
          fileCount: extracted.fileCount,
          totalBytes: extracted.totalBytes,
        });
        builderDocument = {
          ...builderDocument,
          customStaticSite,
          seo: {
            ...builderDocument.seo,
            title: parsed.data.pageName,
            description: parsed.data.deployNotes ?? request.businessDescription ?? null,
          },
        };
        uploadedPackageMeta = {
          fileName: zipPackage.fileName,
          mimeType: zipPackage.mimeType,
          sizeBytes: zipPackage.sizeBytes,
          packageSha256: zipPackage.sha256,
          storagePath: stored.relativePath,
          extractedPath: extracted.storagePath,
          fileCount: extracted.fileCount,
          totalBytes: extracted.totalBytes,
          repositoryUrl: parsed.data.repositoryUrl || null,
          uploadedAt: new Date().toISOString(),
          uploadedByUserId: adminSession.user.id,
          source: packageSourceType === "github" ? "custom_project_github" : "custom_project_provision",
        };
      } catch (error) {
        return { error: describeCustomSitePackageError(error), durationMs: Date.now() - startedAt };
      }
    }

    const page = request.storefrontPageId
      ? await prisma.storefrontPage.update({
          where: { id: request.storefrontPageId },
          data: {
            name: parsed.data.pageName,
            slug: defaultSlug,
            description: parsed.data.deployNotes ?? request.businessDescription ?? null,
            status: "ACTIVE",
            isTemporary: false,
            templateKey: "CATALOG",
            builderDocument,
            builderLastSavedAt: new Date(),
            publishedAt: new Date(),
          },
        })
      : await prisma.storefrontPage.create({
          data: {
            tenantId: request.tenantId,
            createdByUserId: adminSession.user.id,
            name: parsed.data.pageName,
            slug: defaultSlug,
            description: parsed.data.deployNotes ?? request.businessDescription ?? null,
            templateKey: "CATALOG",
            status: "ACTIVE",
            isTemporary: false,
            builderDocument,
            builderLastSavedAt: new Date(),
            publishedAt: new Date(),
          },
        });
    const latestVersion = await prisma.storefrontPageVersion.findFirst({
      where: { storefrontPageId: page.id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.customPageRequest.update({
        where: { id: request.id },
        data: {
          storefrontPageId: page.id,
          status: "IN_PROGRESS",
          referenceFiles: uploadedPackageMeta
            ? (() => {
                const current = request.referenceFiles;
                if (Array.isArray(current)) {
                  return [...current, uploadedPackageMeta];
                }
                return [uploadedPackageMeta];
              })()
            : undefined,
          reviewNotes: sanitizeNullableText(
            [
              parsed.data.repositoryUrl || null,
              parsed.data.deployNotes || null,
              uploadedPackageMeta ? `zip:${uploadedPackageMeta.fileName}` : null,
              !uploadedPackageMeta && !parsed.data.repositoryUrl ? "Provision sin paquete externo" : null,
            ]
              .filter(Boolean)
              .join(" | "),
          ),
          reviewedAt: new Date(),
          reviewedByUserId: adminSession.user.id,
        },
      });

      await tx.customProjectMilestone.upsert({
        where: {
          customPageRequestId_stage: {
            customPageRequestId: request.id,
            stage: "DELIVERY",
          },
        },
        update: {
          status: "ENABLED",
          isEnabledByAdmin: true,
          progressPercent: 100,
          notes: "Sitio provisionado por Super Admin y habilitado en editor/publicacion.",
          enabledAt: new Date(),
          updatedByUserId: adminSession.user.id,
        },
        create: {
          tenantId: request.tenantId,
          customPageRequestId: request.id,
          stage: "DELIVERY",
          status: "ENABLED",
          isEnabledByAdmin: true,
          progressPercent: 100,
          notes: "Sitio provisionado por Super Admin y habilitado en editor/publicacion.",
          enabledAt: new Date(),
          updatedByUserId: adminSession.user.id,
        },
      });

      await tx.storefrontPageVersion.create({
        data: {
          storefrontPageId: page.id,
          createdByUserId: adminSession.user.id,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          kind: "PUBLISHED",
          changeSummary: zipPackage
            ? `Publicacion Super Admin desde ${packageSourceType === "github" ? "GitHub" : "ZIP"}.`
            : "Publicacion Super Admin con plantilla Vase.",
          snapshot: builderDocument as Prisma.InputJsonValue,
        },
      });
    });

    await createAuditLog({
      action: "platform.custom_project_provisioned",
      targetType: "storefront_page",
      targetId: page.id,
      tenantId: request.tenantId,
      actorUserId: adminSession.user.id,
      metadata: {
        requestId: request.id,
        slug: page.slug,
        repositoryUrl: parsed.data.repositoryUrl || null,
        zipFileName: uploadedPackageMeta?.fileName ?? null,
      },
    });

    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner");
    revalidatePath(`/app/owner/pages/${page.id}`);
    revalidatePath(`/sites/${page.slug}.vase.ar`);
    const publicUrl = `https://${page.slug}.vase.ar`;
    const durationMs = Date.now() - startedAt;

    if (zipPackage) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.vase.ar';
        const preview_url = `${appUrl}/api/custom-sites/${encodeURIComponent(request.id)}/`;
        const teflonApiUrl = process.env.TEFLON_API_URL || 'https://api.vase.ar';
        const webhookSecret = process.env.VASE_WEBHOOK_SECRET || 'vase_provision_secret_2026';
        
        await fetch(`${teflonApiUrl}/webhooks/vase-provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${webhookSecret}`
          },
          body: JSON.stringify({
            tenant_id: request.tenantId,
            tenant_name: request.tenant.accountName || '',
            preview_url
          })
        }).catch(err => {
          console.error('Failed to notify Teflon webhook:', err);
        });
      } catch (err) {
        console.error('Failed to notify Teflon webhook error block:', err);
      }
    }

    return {
      success: zipPackage
        ? `Paquete ${packageSourceType === "github" ? "GitHub" : "ZIP"} importado y publicado en ${formatDurationMs(durationMs)}: ${publicUrl} · sha256 ${zipPackage.sha256.slice(0, 12)}...`
        : `Proyecto habilitado con plantilla Vase en ${formatDurationMs(durationMs)}: ${publicUrl}`,
      durationMs,
      publicUrl,
      sourceType: packageSourceType,
    };
  } catch {
    return {
      error: "No pudimos provisionar el proyecto personalizado.",
      durationMs: Date.now() - startedAt,
    };
  }
}

export async function createClientAccountAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = createClientAccountSchema.safeParse({
    tenantId: formData.get("tenantId"),
    name: sanitizeText(String(formData.get("name") ?? "")),
    companyName: sanitizeNullableText(String(formData.get("companyName") ?? "")) ?? undefined,
    email: String(formData.get("email") ?? "").trim(),
    phone: sanitizeNullableText(String(formData.get("phone") ?? "")) ?? undefined,
    status: formData.get("status"),
    contractType: formData.get("contractType"),
  });
  if (!parsed.success) return;

  const created = await prisma.clientAccount.create({
    data: {
      tenantId: parsed.data.tenantId,
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      status: parsed.data.status,
      contractType: parsed.data.contractType,
      managedByUserId: session.user.id,
    },
  });

  await createAuditLog({
    action: "platform.client_account_created",
    targetType: "client_account",
    targetId: created.id,
    tenantId: created.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      status: created.status,
      contractType: created.contractType,
    },
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function rollbackCustomProjectDeploymentAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  const startedAt = Date.now();
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = rollbackCustomProjectDeploymentSchema.safeParse({
      requestId: formData.get("requestId"),
      tenantId: formData.get("tenantId"),
    });
    if (!parsed.success) {
      return { error: "No pudimos interpretar el rollback solicitado.", durationMs: Date.now() - startedAt };
    }

    const request = await prisma.customPageRequest.findFirst({
      where: { id: parsed.data.requestId, tenantId: parsed.data.tenantId },
      select: {
        id: true,
        tenantId: true,
        storefrontPageId: true,
        referenceFiles: true,
        storefrontPage: { select: { id: true, slug: true, builderDocument: true } },
      },
    });
    if (!request || !request.storefrontPageId || !request.storefrontPage) {
      return { error: "La solicitud aun no tiene un sitio provisionado.", durationMs: Date.now() - startedAt };
    }

    await rollbackCustomSitePackage({ siteId: request.id });

    const rawBuilderDocument = request.storefrontPage.builderDocument as Prisma.JsonObject | null;
    const previousManifest = (rawBuilderDocument?.customStaticSite as Prisma.JsonObject | undefined) ?? undefined;
    const nextManifest: Prisma.InputJsonValue = {
      ...(previousManifest ?? {}),
      rolledBackAt: new Date().toISOString(),
      rolledBackByUserId: adminSession.user.id,
      rollbackFromRequestId: request.id,
    };

    await prisma.$transaction(async (tx) => {
      await tx.storefrontPage.update({
        where: { id: request.storefrontPageId! },
        data: {
          builderDocument: {
            ...(rawBuilderDocument ?? {}),
            customStaticSite: nextManifest,
          } as Prisma.InputJsonValue,
          builderLastSavedAt: new Date(),
          publishedAt: new Date(),
        },
      });

      const latestVersion = await tx.storefrontPageVersion.findFirst({
        where: { storefrontPageId: request.storefrontPageId! },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });

      await tx.storefrontPageVersion.create({
        data: {
          storefrontPageId: request.storefrontPageId!,
          createdByUserId: adminSession.user.id,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          kind: "PUBLISHED",
          changeSummary: "Rollback a version anterior inmediata del paquete ZIP.",
          snapshot: {
            ...(rawBuilderDocument ?? {}),
            customStaticSite: nextManifest,
          } as Prisma.InputJsonValue,
        },
      });

      const rollbackMeta = {
        fileName: "rollback",
        mimeType: "application/x.rollback",
        sizeBytes: 0,
        storagePath: `custom-sites/${request.id}/current`,
        rolledBackAt: new Date().toISOString(),
        rolledBackByUserId: adminSession.user.id,
        source: "custom_project_rollback",
      };
      const currentRefs = Array.isArray(request.referenceFiles) ? request.referenceFiles : [];
      await tx.customPageRequest.update({
        where: { id: request.id },
        data: {
          referenceFiles: [...currentRefs, rollbackMeta] as Prisma.InputJsonValue,
          reviewedAt: new Date(),
          reviewedByUserId: adminSession.user.id,
        },
      });
    });

    await createAuditLog({
      action: "platform.custom_project_rollback",
      targetType: "custom_page_request",
      targetId: request.id,
      tenantId: request.tenantId,
      actorUserId: adminSession.user.id,
      metadata: { storefrontPageId: request.storefrontPageId, slug: request.storefrontPage.slug },
    });

    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner");
    revalidatePath(`/app/owner/pages/${request.storefrontPageId}`);
    revalidatePath(`/sites/${request.storefrontPage.slug}.vase.ar`);

    const durationMs = Date.now() - startedAt;
    return {
      success: `Rollback aplicado en ${formatDurationMs(durationMs)}.`,
      durationMs,
      publicUrl: `https://${request.storefrontPage.slug}.vase.ar`,
      sourceType: "zip",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOM_SITE_PREVIOUS_VERSION_MISSING") {
      return { error: "No hay version anterior para restaurar.", durationMs: Date.now() - startedAt };
    }
    return { error: "No pudimos ejecutar el rollback del deployment.", durationMs: Date.now() - startedAt };
  }
}

function parseModuleIds(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return [];
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

type ParsedClientAccessPayload =
  | { kind: "v2"; access: ClientProductAccess }
  | { kind: "legacy"; rawConfig: unknown };

function parseClientAccessPayload(rawValue: FormDataEntryValue | null): ParsedClientAccessPayload | null {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return null;
  try {
    const parsedJson: unknown = JSON.parse(rawValue);
    if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) return null;
    if ("version" in parsedJson) {
      const parsed = clientProductAccessEnvelopeSchema.safeParse(parsedJson);
      return parsed.success ? { kind: "v2", access: parsed.data.productAccess } : null;
    }
    return { kind: "legacy", rawConfig: parsedJson };
  } catch {
    return null;
  }
}

type TenantPlanForProvisioning = "TRIAL" | "PRO";
type TenantSubscriptionPlanSource = {
  plan: "START" | "PREMIUM";
  premiumEnabled: boolean;
} | null | undefined;

function buildActiveAccessModuleIds(input: { businessAccess: boolean; labsAccess: boolean }) {
  const moduleIds: string[] = [];
  if (input.businessAccess) moduleIds.push(userAccessModuleIds.business);
  if (input.labsAccess) moduleIds.push(userAccessModuleIds.labs);
  return moduleIds;
}

function resolveTenantPlanFromSubscription(subscription: TenantSubscriptionPlanSource): TenantPlanForProvisioning {
  return subscription?.plan === "PREMIUM" || subscription?.premiumEnabled ? "PRO" : "TRIAL";
}

function resolveOnboardingProductFromActiveModules(moduleIds: string[]) {
  const hasBusiness = moduleIds.includes(userAccessModuleIds.business);
  const hasLabs = moduleIds.includes(userAccessModuleIds.labs);

  if (hasBusiness && hasLabs) return "BOTH";
  if (hasLabs) return "LABS";
  return "BUSINESS";
}

async function syncUserModuleAccess(params: {
  tx: Prisma.TransactionClient;
  userId: string;
  moduleIds: string[];
}) {
  const activeModuleIds = new Set(params.moduleIds);

  for (const moduleId of [userAccessModuleIds.business, userAccessModuleIds.labs]) {
    const isActive = activeModuleIds.has(moduleId);

    await params.tx.userModuleAccess.upsert({
      where: {
        userId_moduleId: {
          userId: params.userId,
          moduleId,
        },
      },
      update: {
        isActive,
      },
      create: {
        userId: params.userId,
        moduleId,
        isActive,
      },
    });
  }
}

async function syncTenantProductAndLabsWorkspace(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  moduleIds: string[];
  tenantPlan: TenantPlanForProvisioning;
  labsSubmodules?: Array<{ moduleId: string; key: string | null; isActive?: boolean }>;
  tenantName: string;
  userEmail: string;
}) {
  await params.tx.tenant.update({
    where: { id: params.tenantId },
    data: {
      onboardingProduct: resolveOnboardingProductFromActiveModules(params.moduleIds),
    },
  });

  const labsWorkspace = buildLabsWorkspaceProvisioning({
    moduleIds: params.moduleIds,
    tenantPlan: params.tenantPlan,
    labsSubmodules: params.labsSubmodules,
    tenantName: params.tenantName,
    userEmail: params.userEmail,
  });

  if (!labsWorkspace) return;

  await params.tx.tenantAiWorkspace.upsert({
    where: { tenantId: params.tenantId },
    update: {
      plan: labsWorkspace.plan,
      monthlyConversationLimit: labsWorkspace.monthlyConversationLimit,
      monthlyKnowledgeItemLimit: labsWorkspace.monthlyKnowledgeItemLimit,
      maxChannels: labsWorkspace.maxChannels,
      maxFiles: labsWorkspace.maxFiles,
      maxUrls: labsWorkspace.maxUrls,
    },
    create: {
      tenantId: params.tenantId,
      plan: labsWorkspace.plan,
      assistantDisplayName: labsWorkspace.assistantDisplayName,
      tone: labsWorkspace.tone,
      trainingStatus: labsWorkspace.trainingStatus,
      timezone: labsWorkspace.timezone,
      businessHours: labsWorkspace.businessHours as Prisma.InputJsonValue,
      humanEscalationEnabled: labsWorkspace.humanEscalationEnabled,
      escalationDestination: labsWorkspace.escalationDestination,
      escalationContact: labsWorkspace.escalationContact || null,
      scrapingEnabled: labsWorkspace.scrapingEnabled,
      monthlyConversationLimit: labsWorkspace.monthlyConversationLimit,
      monthlyKnowledgeItemLimit: labsWorkspace.monthlyKnowledgeItemLimit,
      maxChannels: labsWorkspace.maxChannels,
      maxFiles: labsWorkspace.maxFiles,
      maxUrls: labsWorkspace.maxUrls,
    },
  });
}

export async function upsertMasterUserWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.USERS);
    await ensureModuleCatalogSynced();

    const parsed = upsertMasterUserSchema.safeParse({
      userId: String(formData.get("userId") ?? "").trim(),
      name: sanitizeText(String(formData.get("name") ?? "")),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      autoGeneratePassword: formData.get("autoGeneratePassword") === "true",
      temporaryPassword: formData.get("temporaryPassword") === "true",
      uiRole: String(formData.get("uiRole") ?? "").trim(),
      moduleIds: parseModuleIds(formData.get("moduleIds")),
      clientAccessConfig: String(formData.get("clientAccessConfig") ?? ""),
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, email, rol y modulos." };
    }

    const roleMap = getRoleMappingFromUiRole(parsed.data.uiRole);
    const createFlow = !parsed.data.userId;
    const generatedPassword = createFlow && parsed.data.autoGeneratePassword ? generateTemporaryPassword() : null;
    const rawPassword = (parsed.data.password || generatedPassword || "").trim();

    if (createFlow && !rawPassword) {
      return { error: "Define una contrasena o usa generacion automatica." };
    }

    if (rawPassword.length > 0 && (rawPassword.length < 8 || rawPassword.length > 72)) {
      return { error: "La contrasena debe tener entre 8 y 72 caracteres." };
    }

    const passwordHash = rawPassword ? await hashPassword(rawPassword) : null;
    const shouldForcePasswordReset = shouldForceAdminCreatedUserPasswordReset({
      temporaryPassword: parsed.data.temporaryPassword,
      rawPassword,
    });
    const requestedModuleIds = parsed.data.moduleIds;
    const moduleIds = roleMap.appRole === "ADMIN" || parsed.data.uiRole === "cliente" ? [] : requestedModuleIds;
    const clientAccessPayload = parsed.data.uiRole === "cliente"
      ? parseClientAccessPayload(formData.get("clientAccessConfig"))
      : null;

    if (parsed.data.uiRole === "cliente" && !clientAccessPayload) {
      return { error: "La configuracion de productos del cliente no es valida." };
    }

    const selectedModules = moduleIds.length
      ? await prisma.module.findMany({
          where: { id: { in: moduleIds }, isActive: true },
          select: { id: true },
        })
      : [];

    if (moduleIds.length !== selectedModules.length) {
      return { error: "Uno o mas modulos seleccionados no son validos." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const roleRecord = await tx.role.upsert({
        where: { key: roleMap.appRole },
        update: {
          name: roleMap.appRole,
          isSystem: true,
        },
        create: {
          key: roleMap.appRole,
          name: roleMap.appRole,
          isSystem: true,
        },
        select: { id: true },
      });

      const existingByEmail = await tx.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      });
      const existingTargetUser = parsed.data.userId
        ? await tx.user.findUnique({
            where: { id: parsed.data.userId },
            select: { clientAccessConfig: true },
          })
        : null;
      const storedClientProductAccess = parseStoredClientProductAccess(existingTargetUser?.clientAccessConfig);

      const resolveClientProductAccess = async (ownerUserId: string) => {
        if (!clientAccessPayload) return null;
        if (clientAccessPayload.kind === "v2") return clientAccessPayload.access;
        return adaptLegacyClientProductAccessWithTx({
          tx,
          ownerUserId,
          moduleIds: requestedModuleIds,
          rawConfig: clientAccessPayload.rawConfig,
          storedAccess: storedClientProductAccess,
        });
      };

      if (createFlow) {
        if (existingByEmail) throw new Error("EMAIL_ALREADY_EXISTS");

        const now = new Date();
        const createdUser = await tx.user.create({
          data: {
            name: parsed.data.name,
            email: parsed.data.email,
            passwordHash: passwordHash ?? undefined,
            platformRole: roleMap.platformRole,
            locale: "es",
            clientAccessConfig: clientAccessPayload?.kind === "v2"
              ? ({ version: 2, productAccess: clientAccessPayload.access } as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            ...buildAdminCreatedUserVerification(now),
            forcePasswordChange: shouldForcePasswordReset,
            tempPasswordIssuedAt: shouldForcePasswordReset ? now : null,
            ...(parsed.data.uiRole === "soporte" || parsed.data.uiRole === "developer"
              ? {
                  internalProfile: {
                    create: {
                      type: parsed.data.uiRole === "soporte" ? "SUPPORT" : "DEVELOPER",
                      tempPasswordActive: shouldForcePasswordReset,
                      mustResetPassword: shouldForcePasswordReset,
                      tempPasswordExpiresAt: shouldForcePasswordReset
                        ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
                        : null,
                      availability: "OFFLINE",
                    },
                  },
                }
              : {}),
          },
          select: { id: true, email: true, name: true },
        });

        await tx.userRole.deleteMany({ where: { userId: createdUser.id } });
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: roleRecord.id,
          },
        });

        if (selectedModules.length > 0) {
          await tx.userModuleAccess.createMany({
            data: selectedModules.map((module) => ({
              userId: createdUser.id,
              moduleId: module.id,
              isActive: true,
            })),
            skipDuplicates: true,
          });
        }

        const resolvedClientProductAccess = await resolveClientProductAccess(createdUser.id);
        if (resolvedClientProductAccess && clientAccessPayload?.kind === "legacy") {
          await tx.user.update({
            where: { id: createdUser.id },
            data: {
              clientAccessConfig: {
                version: 2,
                productAccess: resolvedClientProductAccess,
              } as Prisma.InputJsonValue,
            },
          });
        }
        const productAccessResult = resolvedClientProductAccess
          ? await applyClientProductAccess({
            tx,
            actorUserId: adminSession.user.id,
            ownerUserId: createdUser.id,
            ownerName: createdUser.name,
            ownerEmail: createdUser.email,
            access: resolvedClientProductAccess,
            businessFeatureMode: clientAccessPayload?.kind === "legacy" ? "PRESERVE" : "REPLACE",
            tenantSlugSeed: createdUser.name || createdUser.email.split("@")[0],
          })
          : null;
        const auditPayload = {
          action: "platform.master_user_created",
          targetType: "user",
          targetId: createdUser.id,
          actorUserId: adminSession.user.id,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          metadata: {
            uiRole: parsed.data.uiRole,
            moduleIds: productAccessResult?.activeModuleIds ?? moduleIds,
            clientProductAccessChange: buildClientProductAccessAuditChange(
              null,
              resolvedClientProductAccess,
            ),
          },
        };
        await persistAuditLog(tx, auditPayload);
        return { userId: createdUser.id, created: true as const, auditPayload };
      }

      if (existingByEmail && existingByEmail.id !== parsed.data.userId) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }

      if (!parsed.data.userId) throw new Error("CLIENT_USER_ID_REQUIRED");
      const resolvedClientProductAccess = await resolveClientProductAccess(parsed.data.userId);

      const updatedUser = await tx.user.update({
        where: { id: parsed.data.userId },
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          platformRole: roleMap.platformRole,
          clientAccessConfig: resolvedClientProductAccess
            ? ({ version: 2, productAccess: resolvedClientProductAccess } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          ...(!parsed.data.temporaryPassword
            ? {
                forcePasswordChange: false,
                tempPasswordIssuedAt: null,
              }
            : {}),
          ...(passwordHash
            ? {
                passwordHash,
                forcePasswordChange: shouldForcePasswordReset,
                tempPasswordIssuedAt: shouldForcePasswordReset ? new Date() : null,
                passwordChangedAt: new Date(),
              }
            : {}),
        },
        select: { id: true, email: true, name: true },
      });

      await tx.userRole.deleteMany({ where: { userId: updatedUser.id } });
      await tx.userRole.create({
        data: {
          userId: updatedUser.id,
          roleId: roleRecord.id,
        },
      });

      if (!resolvedClientProductAccess) {
        await tx.userModuleAccess.deleteMany({ where: { userId: updatedUser.id } });
        if (selectedModules.length > 0) {
          await tx.userModuleAccess.createMany({
            data: selectedModules.map((module) => ({
              userId: updatedUser.id,
              moduleId: module.id,
              isActive: true,
            })),
            skipDuplicates: true,
          });
        }
      }

      const productAccessResult = resolvedClientProductAccess
        ? await applyClientProductAccess({
          tx,
          actorUserId: adminSession.user.id,
          ownerUserId: updatedUser.id,
          ownerName: updatedUser.name,
          ownerEmail: updatedUser.email,
          access: resolvedClientProductAccess,
          businessFeatureMode: clientAccessPayload?.kind === "legacy" ? "PRESERVE" : "REPLACE",
          tenantSlugSeed: updatedUser.name || updatedUser.email.split("@")[0],
        })
        : null;

      if (parsed.data.uiRole === "soporte" || parsed.data.uiRole === "developer") {
        await tx.internalUserProfile.upsert({
          where: { userId: updatedUser.id },
          update: {
            type: parsed.data.uiRole === "soporte" ? "SUPPORT" : "DEVELOPER",
            tempPasswordActive: passwordHash || !parsed.data.temporaryPassword ? shouldForcePasswordReset : undefined,
            mustResetPassword: passwordHash || !parsed.data.temporaryPassword ? shouldForcePasswordReset : undefined,
            tempPasswordExpiresAt: shouldForcePasswordReset
              ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
              : !parsed.data.temporaryPassword
                ? null
                : undefined,
          },
          create: {
            userId: updatedUser.id,
            tenantId: null,
            type: parsed.data.uiRole === "soporte" ? "SUPPORT" : "DEVELOPER",
            tempPasswordActive: shouldForcePasswordReset,
            mustResetPassword: shouldForcePasswordReset,
            tempPasswordExpiresAt: shouldForcePasswordReset
              ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
              : null,
            availability: "OFFLINE",
          },
        });
      } else {
        await tx.internalUserProfile.deleteMany({ where: { userId: updatedUser.id } });
      }

      const auditPayload = {
        action: "platform.master_user_updated",
        targetType: "user",
        targetId: updatedUser.id,
        actorUserId: adminSession.user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: {
          uiRole: parsed.data.uiRole,
          moduleIds: productAccessResult?.activeModuleIds ?? moduleIds,
          clientProductAccessChange: buildClientProductAccessAuditChange(
            storedClientProductAccess,
            resolvedClientProductAccess,
          ),
        },
      };
      await persistAuditLog(tx, auditPayload);
      return { userId: updatedUser.id, created: false as const, auditPayload };
    });

    emitAuditLogEvent(result.auditPayload);

    revalidatePath("/app/admin/users");
    return { success: result.created ? "Usuario creado." : "Usuario actualizado." };
  } catch (error) {
    if (error instanceof Error && error.message === "ROLE_NOT_FOUND") {
      return { error: "No encontramos el rol seleccionado en el sistema." };
    }
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return { error: "Ya existe un usuario con ese email." };
    }
    if (error instanceof Error && error.message === "REST_PRICING_NOT_PUBLISHED") {
      return { error: "El precio de Vase Rest seleccionado no esta publicado." };
    }
    if (error instanceof Error && error.message === "CLIENT_LEGACY_REST_PLAN_REQUIRED") {
      return { error: "Para activar Vase Rest, elegí un plan Rest publicado." };
    }
    if (error instanceof Error && error.message === "CLIENT_LABS_PLAN_INVALID") {
      return { error: "El plan de Vase Labs no coincide con el submodulo seleccionado." };
    }
    if (error instanceof Error && error.message === "CLIENT_BUSINESS_SUBMODULE_INVALID") {
      return { error: "Uno de los submodulos de Vase Business no es valido." };
    }
    if (error instanceof Error && (error.message === "CLIENT_FEATURE_SCOPE_INVALID" || error.message === "CLIENT_FEATURE_VALUE_INVALID")) {
      return { error: "Una caracteristica de Vase Business no pertenece al alcance indicado o tiene un valor invalido." };
    }
    if (error instanceof Error && error.message === "CLIENT_MODULE_CATALOG_INVALID") {
      return { error: "Uno de los productos seleccionados no esta disponible." };
    }
    return { error: "No pudimos guardar el usuario." };
  }
}

export async function deleteMasterUserWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const requestContext = await getRequestContext();
    const adminSession = await requireAdminPermission(adminPermissions.USERS);
    const parsed = deleteMasterUserSchema.safeParse({
      userId: formData.get("userId"),
    });
    if (!parsed.success) return { error: "Usuario invalido para eliminar." };
    if (parsed.data.userId === adminSession.user.id) return { error: "No puedes eliminar tu propia cuenta." };

    await prisma.$transaction(async (tx) => {
      await tx.userModuleAccess.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.userRole.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.adminAccessPolicy.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.internalUserProfile.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.membership.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.session.deleteMany({ where: { userId: parsed.data.userId } });
      await tx.user.delete({ where: { id: parsed.data.userId } });
    });

    await createAuditLog({
      action: "platform.master_user_deleted",
      targetType: "user",
      targetId: parsed.data.userId,
      actorUserId: adminSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin/users");
    return { success: "Usuario eliminado definitivamente." };
  } catch {
    return { error: "No pudimos eliminar el usuario." };
  }
}

export async function createUserClientPaymentWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
    const parsed = createUserClientPaymentSchema.safeParse({
      userId: formData.get("userId"),
      clientAccountId: String(formData.get("clientAccountId") ?? "").trim(),
      category: formData.get("category"),
      concept: sanitizeText(String(formData.get("concept") ?? "")),
      moduleId: String(formData.get("moduleId") ?? "").trim(),
      submoduleId: String(formData.get("submoduleId") ?? "").trim(),
      totalAmount: formData.get("totalAmount"),
      paidAmount: formData.get("paidAmount"),
      paidAt: String(formData.get("paidAt") ?? "").trim() || undefined,
      method: sanitizeNullableText(String(formData.get("method") ?? "")) ?? undefined,
      notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
      status: formData.get("status"),
    });
    if (!parsed.success) return { error: "Revisa los datos del pago." };

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true },
    });
    if (!user) return { error: "No encontramos el usuario seleccionado." };

    const linkedAccounts = await prisma.clientAccount.findMany({
      where: {
        OR: [{ managedByUserId: user.id }, { email: user.email }],
      },
      select: { id: true, tenantId: true, name: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
    });
    if (linkedAccounts.length === 0) {
      return { error: "Este usuario cliente no tiene una cuenta cliente vinculada." };
    }

    const clientAccount =
      linkedAccounts.find((account) => account.id === parsed.data.clientAccountId) ??
      linkedAccounts[0];

    const paymentForm = new FormData();
    paymentForm.set("tenantId", clientAccount.tenantId);
    paymentForm.set("clientAccountId", clientAccount.id);
    paymentForm.set("concept", parsed.data.concept);
    paymentForm.set("category", parsed.data.category);
    paymentForm.set("moduleId", parsed.data.moduleId ?? "");
    paymentForm.set("submoduleId", parsed.data.submoduleId ?? "");
    paymentForm.set("totalAmount", String(parsed.data.totalAmount));
    paymentForm.set("paidAmount", String(parsed.data.paidAmount));
    paymentForm.set("paidAt", parsed.data.paidAt ?? "");
    paymentForm.set("method", parsed.data.method ?? "");
    paymentForm.set("notes", parsed.data.notes ?? "");
    paymentForm.set("status", parsed.data.status);

    await createClientPaymentAction(paymentForm);
    revalidatePath("/app/admin/users");
    return { success: `Pago registrado para ${clientAccount.name}.` };
  } catch {
    return { error: "No pudimos registrar el pago del cliente." };
  }
}

export async function createClientAccountWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await createClientAccountAction(formData);
    return { success: "Cliente creado correctamente." };
  } catch {
    return { error: "No pudimos crear el cliente." };
  }
}

export async function createClientPaymentAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = createClientPaymentSchema.safeParse({
    tenantId: formData.get("tenantId"),
    clientAccountId: formData.get("clientAccountId"),
    concept: sanitizeText(String(formData.get("concept") ?? "")),
    category: formData.get("category"),
    moduleId: String(formData.get("moduleId") ?? "").trim(),
    submoduleId: String(formData.get("submoduleId") ?? "").trim(),
    totalAmount: formData.get("totalAmount"),
    paidAmount: formData.get("paidAmount"),
    paidAt: String(formData.get("paidAt") ?? ""),
    method: sanitizeNullableText(String(formData.get("method") ?? "")) ?? undefined,
    notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const created = await prisma.clientPayment.create({
    data: {
      tenantId: parsed.data.tenantId,
      clientAccountId: parsed.data.clientAccountId,
      createdByUserId: session.user.id,
      moduleId: parsed.data.moduleId || null,
      submoduleId: parsed.data.submoduleId || null,
      concept: parsed.data.concept,
      category: parsed.data.category,
      totalAmount: parsed.data.totalAmount,
      paidAmount: parsed.data.paidAmount,
      paidAt: toNullableDate(parsed.data.paidAt ?? ""),
      method: parsed.data.method || null,
      notes: parsed.data.notes || null,
      status: parsed.data.status,
    },
  });
  await rebuildPaymentAllocations(created.id);

  await createAuditLog({
    action: "platform.client_payment_created",
    targetType: "client_payment",
    targetId: created.id,
    tenantId: created.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      category: created.category,
      status: created.status,
      totalAmount: Number(created.totalAmount),
      paidAmount: Number(created.paidAmount),
    },
  });
  if (created.status === "PAST_DUE" || Number(created.totalAmount) > Number(created.paidAmount)) {
    await createAutoAdminNotification({
      title: "Pago con deuda pendiente",
      message: `El pago "${created.concept}" quedÃ³ pendiente o parcial.`,
      category: "billing",
      tone: "warning",
      targetRole: "SUPER_ADMIN",
      tenantId: created.tenantId,
    });
  }

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function createClientPaymentWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await createClientPaymentAction(formData);
    return { success: "Pago registrado correctamente." };
  } catch {
    return { error: "No pudimos registrar el pago." };
  }
}

export async function createExpenseAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = createExpenseSchema.safeParse({
    tenantId: formData.get("tenantId"),
    clientAccountId: formData.get("clientAccountId"),
    name: sanitizeText(String(formData.get("name") ?? "")),
    category: sanitizeText(String(formData.get("category") ?? "")),
    amount: formData.get("amount"),
    startsAt: String(formData.get("startsAt") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    frequency: formData.get("frequency"),
    status: formData.get("status"),
    responsible: sanitizeNullableText(String(formData.get("responsible") ?? "")) ?? undefined,
    notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
  });
  if (!parsed.success) return;

  const created = await prisma.expense.create({
    data: {
      tenantId: parsed.data.tenantId,
      clientAccountId: parsed.data.clientAccountId || null,
      createdByUserId: session.user.id,
      name: parsed.data.name,
      category: parsed.data.category,
      amount: parsed.data.amount,
      startsAt: toNullableDate(parsed.data.startsAt ?? ""),
      dueAt: toNullableDate(parsed.data.dueAt ?? ""),
      frequency: parsed.data.frequency,
      status: parsed.data.status,
      responsible: parsed.data.responsible || null,
      notes: parsed.data.notes || null,
    },
  });

  await createAuditLog({
    action: "platform.expense_created",
    targetType: "expense",
    targetId: created.id,
    tenantId: created.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      category: created.category,
      status: created.status,
      amount: Number(created.amount),
      frequency: created.frequency,
    },
  });

  revalidatePath("/app/admin/expenses");
  revalidatePath("/app/admin/finance");
}

export async function updateClientAccountAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateClientAccountSchema.safeParse({
    clientAccountId: formData.get("clientAccountId"),
    name: sanitizeText(String(formData.get("name") ?? "")),
    companyName: sanitizeNullableText(String(formData.get("companyName") ?? "")) ?? undefined,
    email: String(formData.get("email") ?? "").trim(),
    phone: sanitizeNullableText(String(formData.get("phone") ?? "")) ?? undefined,
    status: formData.get("status"),
    contractType: formData.get("contractType"),
  });
  if (!parsed.success) return;

  const before = await prisma.clientAccount.findUnique({ where: { id: parsed.data.clientAccountId } });
  if (!before) return;

  const updated = await prisma.clientAccount.update({
    where: { id: parsed.data.clientAccountId },
    data: {
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      status: parsed.data.status,
      contractType: parsed.data.contractType,
    },
  });

  await createAuditLog({
    action: "platform.client_account_updated",
    targetType: "client_account",
    targetId: updated.id,
    tenantId: updated.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before, after: updated },
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function updateClientAccountWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await updateClientAccountAction(formData);
    return { success: "Cliente actualizado." };
  } catch {
    return { error: "No pudimos actualizar el cliente." };
  }
}

export async function deleteClientAccountAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = deleteClientAccountSchema.safeParse({
    clientAccountId: formData.get("clientAccountId"),
  });
  if (!parsed.success) return;

  const target = await prisma.clientAccount.findUnique({ where: { id: parsed.data.clientAccountId } });
  if (!target) return;

  await prisma.clientAccount.delete({ where: { id: parsed.data.clientAccountId } });
  await createAuditLog({
    action: "platform.client_account_deleted",
    targetType: "client_account",
    targetId: target.id,
    tenantId: target.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function deleteClientAccountWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await deleteClientAccountAction(formData);
    return { success: "Cliente eliminado." };
  } catch {
    return { error: "No pudimos eliminar el cliente." };
  }
}

export async function updateClientPaymentAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateClientPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    concept: sanitizeText(String(formData.get("concept") ?? "")),
    category: formData.get("category"),
    moduleId: String(formData.get("moduleId") ?? "").trim(),
    submoduleId: String(formData.get("submoduleId") ?? "").trim(),
    totalAmount: formData.get("totalAmount"),
    paidAmount: formData.get("paidAmount"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const before = await prisma.clientPayment.findUnique({ where: { id: parsed.data.paymentId } });
  if (!before) return;

  const updated = await prisma.clientPayment.update({
    where: { id: parsed.data.paymentId },
    data: {
      concept: parsed.data.concept,
      category: parsed.data.category,
      moduleId: parsed.data.moduleId || null,
      submoduleId: parsed.data.submoduleId || null,
      totalAmount: parsed.data.totalAmount,
      paidAmount: parsed.data.paidAmount,
      status: parsed.data.status,
    },
  });
  await rebuildPaymentAllocations(updated.id);

  await createAuditLog({
    action: "platform.client_payment_updated",
    targetType: "client_payment",
    targetId: updated.id,
    tenantId: updated.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before, after: updated },
  });
  if (updated.status === "PAST_DUE" || Number(updated.totalAmount) > Number(updated.paidAmount)) {
    await createAutoAdminNotification({
      title: "Pago vencido o parcial",
      message: `El pago "${updated.concept}" requiere seguimiento de cobro.`,
      category: "billing",
      tone: "warning",
      targetRole: "SUPER_ADMIN",
      tenantId: updated.tenantId,
    });
  }

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function updateClientPaymentWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await updateClientPaymentAction(formData);
    return { success: "Pago actualizado." };
  } catch {
    return { error: "No pudimos actualizar el pago." };
  }
}

export async function deleteClientPaymentAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = deleteClientPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
  });
  if (!parsed.success) return;

  const target = await prisma.clientPayment.findUnique({ where: { id: parsed.data.paymentId } });
  if (!target) return;

  await prisma.clientPayment.delete({ where: { id: parsed.data.paymentId } });
  await createAuditLog({
    action: "platform.client_payment_deleted",
    targetType: "client_payment",
    targetId: target.id,
    tenantId: target.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function deleteClientPaymentWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await deleteClientPaymentAction(formData);
    return { success: "Pago eliminado." };
  } catch {
    return { error: "No pudimos eliminar el pago." };
  }
}

export async function addPaymentPartialItemAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = addPaymentPartialItemSchema.safeParse({
    paymentId: formData.get("paymentId"),
    amount: formData.get("amount"),
    paidAt: String(formData.get("paidAt") ?? ""),
    method: sanitizeNullableText(String(formData.get("method") ?? "")) ?? undefined,
    note: sanitizeNullableText(String(formData.get("note") ?? "")) ?? undefined,
  });
  if (!parsed.success) return;

  const payment = await prisma.clientPayment.findUnique({
    where: { id: parsed.data.paymentId },
    select: { id: true, tenantId: true, totalAmount: true, paidAmount: true, concept: true, status: true },
  });
  if (!payment) return;

  const newPaidAmount = Number(payment.paidAmount) + parsed.data.amount;
  const totalAmount = Number(payment.totalAmount);
  const normalizedPaid = Math.min(newPaidAmount, totalAmount);
  const nextStatus =
    normalizedPaid >= totalAmount ? "ACTIVE" : payment.status === "CANCELED" ? "CANCELED" : "PAST_DUE";

  await prisma.$transaction(async (tx) => {
    await tx.paymentPartialItem.create({
      data: {
        paymentId: payment.id,
        amount: parsed.data.amount,
        paidAt: toNullableDate(parsed.data.paidAt ?? "") ?? new Date(),
        method: parsed.data.method ?? null,
        note: parsed.data.note ?? null,
      },
    });

    await tx.clientPayment.update({
      where: { id: payment.id },
      data: {
        paidAmount: normalizedPaid,
        paidAt: new Date(),
        status: nextStatus,
      },
    });
  });

  await rebuildPaymentAllocations(payment.id);

  await createAuditLog({
    action: "platform.client_payment_partial_added",
    targetType: "client_payment",
    targetId: payment.id,
    tenantId: payment.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      amount: parsed.data.amount,
      nextPaidAmount: normalizedPaid,
      totalAmount,
      method: parsed.data.method ?? null,
    },
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function addPaymentPartialItemWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await addPaymentPartialItemAction(formData);
    return { success: "Pago parcial registrado correctamente." };
  } catch {
    return { error: "No pudimos registrar el pago parcial." };
  }
}

export async function attachPaymentInvoiceAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = attachPaymentInvoiceSchema.safeParse({
    paymentId: formData.get("paymentId"),
    fileUrl: String(formData.get("fileUrl") ?? ""),
  });
  if (!parsed.success) return;

  const payment = await prisma.clientPayment.findUnique({
    where: { id: parsed.data.paymentId },
    select: { id: true, tenantId: true, concept: true },
  });
  if (!payment) return;

  await (prisma as unknown as { invoiceV2: { create: (args: { data: { paymentId: string; fileUrl: string; uploadedBy: string } }) => Promise<unknown> } }).invoiceV2.create({
    data: {
      paymentId: payment.id,
      fileUrl: parsed.data.fileUrl,
      uploadedBy: session.user.id,
    },
  });

  await createAuditLog({
    action: "platform.client_payment_invoice_attached",
    targetType: "client_payment",
    targetId: payment.id,
    tenantId: payment.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      fileUrl: parsed.data.fileUrl,
    },
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function attachPaymentInvoiceWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await attachPaymentInvoiceAction(formData);
    return { success: "Factura vinculada al pago." };
  } catch {
    return { error: "No pudimos vincular la factura." };
  }
}

export async function updateExpenseAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateExpenseSchema.safeParse({
    expenseId: formData.get("expenseId"),
    name: sanitizeText(String(formData.get("name") ?? "")),
    category: sanitizeText(String(formData.get("category") ?? "")),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const before = await prisma.expense.findUnique({ where: { id: parsed.data.expenseId } });
  if (!before) return;

  const updated = await prisma.expense.update({
    where: { id: parsed.data.expenseId },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      status: parsed.data.status,
    },
  });

  await createAuditLog({
    action: "platform.expense_updated",
    targetType: "expense",
    targetId: updated.id,
    tenantId: updated.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before, after: updated },
  });

  revalidatePath("/app/admin/expenses");
  revalidatePath("/app/admin/finance");
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = deleteExpenseSchema.safeParse({
    expenseId: formData.get("expenseId"),
  });
  if (!parsed.success) return;

  const target = await prisma.expense.findUnique({ where: { id: parsed.data.expenseId } });
  if (!target) return;

  await prisma.expense.delete({ where: { id: parsed.data.expenseId } });
  await createAuditLog({
    action: "platform.expense_deleted",
    targetType: "expense",
    targetId: target.id,
    tenantId: target.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  revalidatePath("/app/admin/expenses");
  revalidatePath("/app/admin/finance");
}

export async function updatePartnerConfigAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updatePartnerConfigSchema.safeParse({
    alexisPercent: formData.get("alexisPercent"),
    darianPercent: formData.get("darianPercent"),
    dantePercent: formData.get("dantePercent"),
    companyPercent: formData.get("companyPercent"),
  });
  if (!parsed.success) return;

  const total =
    parsed.data.alexisPercent +
    parsed.data.darianPercent +
    parsed.data.dantePercent +
    parsed.data.companyPercent;
  if (Math.abs(total - 100) > 0.001) return;

  const existing = await prisma.partnerConfig.findFirst({
    where: { tenantId: null },
    orderBy: { updatedAt: "desc" },
  });
  const updated = existing
    ? await prisma.partnerConfig.update({
        where: { id: existing.id },
        data: parsed.data,
      })
    : await prisma.partnerConfig.create({
        data: {
          tenantId: null,
          ...parsed.data,
        },
      });

  await createAuditLog({
    action: "platform.partner_config_updated",
    targetType: "partner_config",
    targetId: updated.id,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: parsed.data,
  });
  revalidatePath("/app/admin/settings");
  revalidatePath("/app/admin/finance");
}

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

export async function updateBusinessPlanSettingsAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateBusinessPlanSettingsSchema.safeParse({
    basePlanPrice: formData.get("basePlanPrice"),
    customPlanPrice: formData.get("customPlanPrice"),
    includedHostingYearValue: formData.get("includedHostingYearValue"),
    customInitialPercent: formData.get("customInitialPercent"),
    customFinalPercent: formData.get("customFinalPercent"),
    customHostingYearPrice: formData.get("customHostingYearPrice"),
  });
  if (!parsed.success) return;

  const existing = await prisma.businessPlanSetting.findFirst({
    where: { tenantId: null },
    orderBy: { updatedAt: "desc" },
  });
  const updated = existing
    ? await prisma.businessPlanSetting.update({
      where: { id: existing.id },
      data: parsed.data,
    })
    : await prisma.businessPlanSetting.create({
      data: { tenantId: null, ...parsed.data },
    });

  await createAuditLog({
    action: "platform.business_plan_settings_updated",
    targetType: "business_plan_settings",
    targetId: updated.id,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before: existing, after: updated },
  });
  revalidatePath("/app/admin/settings");
}

export async function updateLabsPlanSettingsAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateLabsPlanSettingsSchema.safeParse({
    starterPrice: formData.get("starterPrice"),
    growthPrice: formData.get("growthPrice"),
    proPrice: formData.get("proPrice"),
  });
  if (!parsed.success) return;

  const existing = await prisma.labsPlanSetting.findFirst({
    where: { tenantId: null },
    orderBy: { updatedAt: "desc" },
  });
  const updated = existing
    ? await prisma.labsPlanSetting.update({
      where: { id: existing.id },
      data: parsed.data,
    })
    : await prisma.labsPlanSetting.create({
      data: { tenantId: null, ...parsed.data },
    });

  await createAuditLog({
    action: "platform.labs_plan_settings_updated",
    targetType: "labs_plan_settings",
    targetId: updated.id,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before: existing, after: updated },
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

import { prisma } from "@/lib/db/prisma";
import { appConfig } from "@/config/app";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueAuthToken, consumeAuthToken, revokeAuthTokens } from "@/lib/auth/tokens";
import { generateUniqueTenantSlug } from "@/lib/tenancy/slug";
import { buildAbsoluteUrl } from "@/lib/security/request";
import { createAuditLog } from "@/server/services/audit-log";
import { sendAuthEmail } from "@/server/services/auth-email";
import { sendNoticeEmail } from "@/server/services/auth-email";
import { ensureModuleCatalogSynced } from "@/server/services/modules";

type RequestContext = {
  ipAddress: string;
  userAgent: string | null;
  host: string;
  protocol: string;
};

const AUTO_LOCK_REASON = "AUTO_LOCK_TOO_MANY_FAILED_LOGINS";
const AUTO_LOCK_WINDOW_MS = appConfig.security.loginAutoLockHours * 60 * 60 * 1000;

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  businessName: string;
  accountName: string;
  industry: string;
  businessGoal: string;
  productSelection: "BUSINESS" | "LABS" | "BOTH";
  selectedModules: string[];
  selectedChannels: string[];
  recommendationSummary: string;
  monthlyEstimate: number;
  setupEstimate: number;
  createPremiumTrialUser: boolean;
};

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function validateSignInCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash) {
    return { ok: false as const, reason: "INVALID_CREDENTIALS" };
  }

  if (user.isDisabled) {
    if (
      user.disabledReason === AUTO_LOCK_REASON &&
      user.disabledAt &&
      Date.now() - user.disabledAt.getTime() >= AUTO_LOCK_WINDOW_MS
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isDisabled: false,
          disabledAt: null,
          disabledReason: null,
        },
      });
    } else {
      return { ok: false as const, reason: "USER_DISABLED" };
    }
  }

  const refreshedUser = await findUserByEmail(email);
  if (!refreshedUser?.passwordHash) {
    return { ok: false as const, reason: "INVALID_CREDENTIALS" };
  }

  const passwordMatches = await verifyPassword(password, refreshedUser.passwordHash);

  if (!passwordMatches) {
    return { ok: false as const, reason: "INVALID_CREDENTIALS" };
  }

  return {
    ok: true as const,
    user: refreshedUser,
    forcePasswordChange: Boolean(refreshedUser.forcePasswordChange),
  };
}

export async function sendLoginSecurityEmail(params: {
  email: string;
  name?: string | null;
  requestContext: RequestContext;
}) {
  const locationHint =
    params.requestContext.ipAddress && params.requestContext.ipAddress !== "unknown"
      ? `IP ${params.requestContext.ipAddress}`
      : "IP no disponible";
  const deviceHint = params.requestContext.userAgent ?? "Dispositivo no disponible";

  try {
    await sendNoticeEmail({
      email: params.email,
      subject: "Nuevo inicio de sesion en tu cuenta Vase",
      message: [
        params.name ? `Hola ${params.name},` : "Hola,",
        "Detectamos un inicio de sesion correcto en tu cuenta Vase.",
        `Fecha y hora: ${new Date().toLocaleString("es-AR")}`,
        `Origen: ${locationHint}`,
        `Dispositivo/navegador: ${deviceHint}`,
        "Si no fuiste vos, cambia tu contrasena y contacta soporte.",
      ].join("\n"),
    });
  } catch (error) {
    console.warn("[auth] login security email failed", {
      email: params.email,
      code: error instanceof Error && "code" in error ? error.code : undefined,
      responseCode:
        error instanceof Error && "responseCode" in error ? error.responseCode : undefined,
    });
  }
}

export async function sendTooManyAttemptsEmail(params: {
  email: string;
  name?: string | null;
  requestContext: RequestContext;
}) {
  await sendNoticeEmail({
    email: params.email,
    subject: "Bloqueo temporal por intentos de login",
    message: [
      params.name ? `Hola ${params.name},` : "Hola,",
      "Registramos demasiados intentos fallidos de inicio de sesion hoy.",
      "Tu cuenta fue bloqueada temporalmente por 24 horas para protegerla.",
      `IP detectada: ${params.requestContext.ipAddress}`,
      `Dispositivo/navegador: ${params.requestContext.userAgent ?? "No disponible"}`,
      "Si fuiste vos, vuelve a intentarlo mas tarde. Si no, cambia tu contrasena cuanto antes.",
    ].join("\n"),
  });
}

export async function registerTenantOwner(
  payload: RegisterPayload,
  requestContext: RequestContext,
) {
  await ensureModuleCatalogSynced();
  const existingUser = await findUserByEmail(payload.email);

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_IN_USE");
  }

  const passwordHash = await hashPassword(payload.password);
  const tenantSlug = await generateUniqueTenantSlug(payload.accountName);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
        locale: "es",
        platformRole: "USER",
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        name: payload.businessName,
        accountName: payload.accountName,
        slug: tenantSlug,
        billingEmail: payload.email,
        industry: payload.industry,
        onboardingProduct: payload.productSelection,
        status: "TRIAL",
      },
    });

    await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        plan: "START",
        billingStatus: "TRIAL",
        premiumEnabled:
          payload.selectedModules.length > 1 ||
          payload.selectedModules.includes("frontend_customization") ||
          payload.selectedModules.includes("n8n_automation"),
        customDomainEnabled: payload.selectedModules.includes("custom_domain"),
        temporaryPagesEnabled: true,
        businessProjectLimit: payload.createPremiumTrialUser ? 3 : 1,
        labsAssistantLimit: payload.createPremiumTrialUser ? 2 : 1,
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        graceEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        currentPeriodEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    if (payload.productSelection === "LABS" || payload.productSelection === "BOTH") {
      await tx.tenantAiWorkspace.create({
        data: {
          tenantId: tenant.id,
          plan: "START",
          assistantDisplayName: `${payload.businessName} AI`,
          tone: "PROFESSIONAL",
          trainingStatus: "DRAFT",
          timezone: "America/Argentina/Buenos_Aires",
          businessHours: {
            days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
            hoursStart: "09:00",
            hoursEnd: "18:00",
          },
          humanEscalationEnabled: false,
          escalationDestination: "EMAIL",
          escalationContact: payload.email,
          scrapingEnabled: true,
          monthlyConversationLimit: 300,
          monthlyKnowledgeItemLimit: 25,
          maxChannels: 1,
          maxFiles: 8,
          maxUrls: 5,
        },
      });
    }

    await tx.featureFlag.createMany({
      data: [
        {
          tenantId: tenant.id,
          key: "business_pages",
          description: "Modulo Vase Business habilitado para el tenant.",
          enabled:
            payload.productSelection === "BUSINESS" || payload.productSelection === "BOTH",
        },
        {
          tenantId: tenant.id,
          key: "labs_ai",
          description: "Modulo VaseLabs habilitado para el tenant.",
          enabled: payload.productSelection === "LABS" || payload.productSelection === "BOTH",
        },
        {
          tenantId: tenant.id,
          key: "labs_scraping",
          description: "Permite cargar URLs para scraping controlado del conocimiento.",
          enabled: payload.productSelection === "LABS" || payload.productSelection === "BOTH",
        },
        {
          tenantId: tenant.id,
          key: "labs_channels_instagram",
          description: "Permite conectar Instagram en planes premium de VaseLabs.",
          enabled: payload.selectedChannels.includes("instagram"),
        },
        {
          tenantId: tenant.id,
          key: "premium_custom_domain",
          description: "Acceso a conexion de dominio propio bajo premium.",
          enabled: payload.selectedModules.includes("custom_domain"),
        },
        {
          tenantId: tenant.id,
          key: "business_builder",
          description: "Editor visual de paginas para Vase Business.",
          enabled:
            payload.productSelection === "BUSINESS" || payload.productSelection === "BOTH",
        },
        {
          tenantId: tenant.id,
          key: "admin_customization_queue",
          description: "Solicitudes premium visibles para revision administrativa.",
          enabled: true,
        },
        {
          tenantId: tenant.id,
          key: "integrations_api",
          description: "Integracion con sistema de gestion y flujos por API.",
          enabled: payload.selectedModules.includes("management_api"),
        },
        {
          tenantId: tenant.id,
          key: "automation_n8n",
          description: "Automatizaciones activadas con n8n.",
          enabled: payload.productSelection === "LABS" || payload.productSelection === "BOTH",
        },
        {
          tenantId: tenant.id,
          key: "meta_prompting",
          description: "Playbooks de IA y prompting para canales Meta.",
          enabled: payload.productSelection === "LABS" || payload.productSelection === "BOTH",
        },
        {
          tenantId: tenant.id,
          key: "labs_channels_whatsapp",
          description: "Canal de WhatsApp contemplado en onboarding.",
          enabled: payload.selectedChannels.includes("whatsapp"),
        },
        {
          tenantId: tenant.id,
          key: "labs_channels_facebook",
          description: "Canal de Facebook contemplado en onboarding.",
          enabled: payload.selectedChannels.includes("facebook"),
        },
        {
          tenantId: tenant.id,
          key: "labs_channels_webchat",
          description: "Canal webchat contemplado en onboarding.",
          enabled: payload.selectedChannels.includes("webchat"),
        },
      ],
    });

    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: "OWNER",
        status: "ACTIVE",
      },
      include: {
        tenant: true,
      },
    });

    const moduleIds = [
      ...(payload.productSelection === "BUSINESS" || payload.productSelection === "BOTH"
        ? ["vase_business"]
        : []),
      ...(payload.productSelection === "LABS" || payload.productSelection === "BOTH"
        ? ["vase_labs"]
        : []),
    ];

    if (moduleIds.length > 0) {
      await tx.tenantModule.createMany({
        data: moduleIds.map((moduleId) => ({
          tenantId: tenant.id,
          moduleId,
          isActive: true,
          activatedAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    return { user, tenant, membership };
  });

  const verificationToken = await issueAuthToken(result.user.id, "EMAIL_VERIFICATION");
  const verifyUrl = buildAbsoluteUrl(
    `/verify-email?token=${verificationToken.token}`,
    requestContext,
  );

  await sendAuthEmail({
    email: result.user.email,
    subject: "Verifica tu email en Vase",
    actionUrl: verifyUrl,
  });

  await createAuditLog({
    action: "auth.registered",
    targetType: "tenant",
    targetId: result.tenant.id,
    tenantId: result.tenant.id,
    actorUserId: result.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      productSelection: payload.productSelection,
      tenantSlug,
      businessGoal: payload.businessGoal,
      selectedModules: payload.selectedModules,
      selectedChannels: payload.selectedChannels,
      recommendationSummary: payload.recommendationSummary,
      monthlyEstimate: payload.monthlyEstimate,
      setupEstimate: payload.setupEstimate,
    },
  });

  return result;
}

export async function resendVerificationEmail(userId: string, requestContext: RequestContext) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.emailVerified) {
    return { alreadyVerified: true as const };
  }

  await revokeAuthTokens(userId, "EMAIL_VERIFICATION");
  const token = await issueAuthToken(userId, "EMAIL_VERIFICATION");

  await sendAuthEmail({
    email: user.email,
    subject: "Nuevo enlace de verificacion de Vase",
    actionUrl: buildAbsoluteUrl(`/verify-email?token=${token.token}`, requestContext),
  });

  return { alreadyVerified: false as const };
}

export async function verifyEmailToken(rawToken: string, requestContext: RequestContext) {
  const token = await consumeAuthToken(rawToken, "EMAIL_VERIFICATION");

  if (!token) {
    return { ok: false as const };
  }

  await prisma.user.update({
    where: { id: token.userId },
    data: { emailVerified: new Date() },
  });

  await createAuditLog({
    action: "auth.email_verified",
    targetType: "user",
    targetId: token.userId,
    actorUserId: token.userId,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return { ok: true as const, user: token.user };
}

export async function requestPasswordReset(email: string, requestContext: RequestContext) {
  const user = await findUserByEmail(email);

  if (!user?.passwordHash) {
    return;
  }

  await revokeAuthTokens(user.id, "PASSWORD_RESET");
  const token = await issueAuthToken(user.id, "PASSWORD_RESET");

  await sendAuthEmail({
    email,
    subject: "Recupera tu acceso a Vase",
    actionUrl: buildAbsoluteUrl(`/reset-password?token=${token.token}`, requestContext),
  });

  await createAuditLog({
    action: "auth.password_reset_requested",
    targetType: "user",
    targetId: user.id,
    actorUserId: user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });
}

export async function createForcedPasswordResetToken(
  userId: string,
  requestContext: RequestContext,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  await revokeAuthTokens(user.id, "PASSWORD_RESET");
  const token = await issueAuthToken(user.id, "PASSWORD_RESET");

  await createAuditLog({
    action: "auth.password_reset_forced_login",
    targetType: "user",
    targetId: user.id,
    actorUserId: user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return token.token;
}

export async function resetPasswordWithToken(
  rawToken: string,
  password: string,
  requestContext: RequestContext,
) {
  const token = await consumeAuthToken(rawToken, "PASSWORD_RESET");

  if (!token) {
    return { ok: false as const };
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: token.userId },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      forcePasswordChange: false,
      tempPasswordIssuedAt: null,
    },
  });

  await prisma.session.deleteMany({
    where: { userId: token.userId },
  });

  await revokeAuthTokens(token.userId, "PASSWORD_RESET");

  await createAuditLog({
    action: "auth.password_reset_completed",
    targetType: "user",
    targetId: token.userId,
    actorUserId: token.userId,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return { ok: true as const, user: token.user };
}

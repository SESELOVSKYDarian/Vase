// Parte de auth-onboarding.ts: registerTenantOwner.
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { issueAuthToken } from "@/lib/auth/tokens";
import { generateUniqueTenantSlug } from "@/lib/tenancy/slug";
import { buildAbsoluteUrl } from "@/lib/security/request";
import { createAuditLog } from "@/server/services/audit-log";
import { sendAuthEmail } from "@/server/services/auth-email";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { trialEndsAtFrom } from "@/server/services/trial/trial-rules";
import { RegisterPayload, RequestContext, findUserByEmail } from "./validate-sign-in-credentials";

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
        // Prueba gratis de 7 días: el día 8 los productos quedan en pausa hasta que pague.
        trialStartedAt: new Date(),
        trialEndsAt: trialEndsAtFrom(new Date()),
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
    subject: "Confirmá tu correo para empezar con Vase",
    actionUrl: verifyUrl,
    title: "Confirmá tu correo",
    greeting: result.user.name ? `Hola, ${result.user.name.split(" ")[0]}` : "Hola",
    paragraphs: ["Gracias por crear tu cuenta en Vase. Confirmá que este correo es tuyo y ya podés entrar a tu panel."],
    buttonLabel: "Confirmar mi correo",
    note: "El enlace se puede usar una sola vez. Si no creaste una cuenta en Vase, ignorá este correo.",
    reason: "Recibiste este correo porque se creó una cuenta de Vase con esta dirección.",
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

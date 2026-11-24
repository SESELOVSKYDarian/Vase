// Parte de dashboard.ts: getUnifiedTenantDashboard.
import { buildDismissedNotificationKey } from "@/lib/navigation/panel-sections";
import { prisma } from "@/lib/db/prisma";
import { BUSINESS_WORKSPACE_PATH } from "@/lib/business/links";
import { getTenantModulesAccess } from "@/server/queries/modules";
import { buildLabsSystemNotifications, buildNotificationReadKey, type ShellNotification } from "@/server/services/labs-notifications";
import { addDays, asEventTone, buildOperationalScore, formatStatusLabel, getDayRange, getDaysUntil, isSchemaMismatchError } from "./get-business-owner-dashboard";

export async function getUnifiedTenantDashboard(
  tenantId: string,
  userId?: string,
  platformRole: "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER" = "USER",
) {
  const [{ start: todayStart, end: todayEnd }, { start: yesterdayStart, end: yesterdayEnd }, modulesPayload] =
    await Promise.all([
      Promise.resolve(getDayRange(0)),
      Promise.resolve(getDayRange(-1)),
      getTenantModulesAccess(tenantId, userId),
    ]);

  if (!modulesPayload) {
    return null;
  }

  const businessModule = modulesPayload.modules.find((module) => module.key === "business") ?? null;
  const labsModule = modulesPayload.modules.find((module) => module.key === "labs") ?? null;

  const [
    todaySales,
    yesterdaySales,
    pendingOrders,
    totalPages,
    activePages,
    totalDomains,
    connectedDomains,
    customRequestsToday,
    knowledgeItems,
    totalChannels,
    connectedChannels,
    openConversations,
    conversationsToday,
    trainingJobsReady,
    activeSupportTickets,
    supportTicketsToday,
    enabledFeatureFlags,
    activeApiCredentials,
    activeWebhooks,
    inboundSyncRecords,
    recentOrders,
    recentDomains,
    recentChannels,
    recentSupportTickets,
    recentTrainingJobs,
    tenantRecord,
    subscription,
    activePlatformUpdates,
    adminTargetedNotifications,
    platformReadRows,
    adminReadRows,
    systemReadRows,
    labsWorkspace,
    labsNotificationConversations,
    labsNotificationChannels,
    labsNotificationTrainingJobs,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.order.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: yesterdayStart,
          lt: yesterdayEnd,
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.order.count({
      where: {
        tenantId,
        status: {
          in: ["PENDING", "CONFIRMED", "PROCESSING"],
        },
      },
    }),
    prisma.storefrontPage.count({
      where: { tenantId },
    }),
    prisma.storefrontPage.count({
      where: {
        tenantId,
        status: {
          not: "ARCHIVED",
        },
      },
    }),
    prisma.domainConnection.count({
      where: { tenantId },
    }),
    prisma.domainConnection.count({
      where: {
        tenantId,
        status: "CONNECTED",
      },
    }),
    prisma.customPageRequest.count({
      where: {
        tenantId,
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    }),
    prisma.aiKnowledgeItem.count({
      where: { tenantId },
    }),
    prisma.aiChannelConnection.count({
      where: { tenantId },
    }),
    prisma.aiChannelConnection.count({
      where: {
        tenantId,
        status: "CONNECTED",
      },
    }),
    prisma.aiConversation.count({
      where: {
        tenantId,
        status: "OPEN",
      },
    }),
    prisma.aiConversation.count({
      where: {
        tenantId,
        startedAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    }),
    prisma.aiTrainingJob.count({
      where: {
        tenantId,
        status: "READY",
      },
    }),
    prisma.supportTicket.count({
      where: {
        tenantId,
        status: {
          in: ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"],
        },
      },
    }),
    prisma.supportTicket.count({
      where: {
        tenantId,
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    }),
    prisma.featureFlag.count({
      where: {
        tenantId,
        enabled: true,
      },
    }),
    prisma.integrationApiCredential.count({
      where: {
        tenantId,
        status: "ACTIVE",
      },
    }),
    prisma.integrationWebhookEndpoint.count({
      where: {
        tenantId,
        status: "ACTIVE",
      },
    }),
    prisma.syncJob.count({
      where: {
        tenantId,
        status: "COMPLETED",
      },
    }),
    prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.domainConnection.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 2,
      select: {
        id: true,
        hostname: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.aiChannelConnection.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 2,
      select: {
        id: true,
        channelType: true,
        accountLabel: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.supportTicket.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 2,
      select: {
        id: true,
        subject: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.aiTrainingJob.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 2,
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        createdAt: true,
      },
    }),
    prisma.tenantSubscription
      .findUnique({
        where: { tenantId },
        select: {
          billingStatus: true,
          currentPeriodEndsAt: true,
          trialEndsAt: true,
          graceEndsAt: true,
          businessBlockedAt: true,
          businessProjectLimit: true,
        },
      })
      .catch((error) => {
        if (isSchemaMismatchError(error)) {
          return null;
        }
        throw error;
      }),
    prisma.platformUpdate.findMany({
      where: {
        isActive: true,
        publishedAt: { gte: addDays(new Date(), -7) },
      },
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
    prisma.adminNotification
      .findMany({
        where: {
          isActive: true,
          OR: [
            { startsAt: null },
            { startsAt: { lte: new Date() } },
          ],
          AND: [
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: new Date() } },
              ],
            },
            {
              OR: [
                { target: "ALL" },
                { target: "TENANT", tenantId },
                { target: "PLATFORM_ROLE", targetRole: platformRole },
                { target: "USERS" },
              ],
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
      .catch((error) => {
        if (isSchemaMismatchError(error)) {
          return [];
        }
        throw error;
      }),
    userId
      ? prisma.platformUpdateRead.findMany({
          where: { userId },
          select: { updateId: true },
        })
      : Promise.resolve([]),
    userId
      ? prisma.adminNotificationRead
          .findMany({
            where: { userId },
            select: { notificationId: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    userId
      ? prisma.systemNotificationRead
          .findMany({
            where: { userId, tenantId },
            select: { notificationKey: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.tenantAiWorkspace.findUnique({
      where: { tenantId },
      select: { id: true },
    }).catch(() => null),
    prisma.aiConversation.findMany({
      where: {
        tenantId,
        OR: [{ escalatedToHuman: true }, { intentLabel: "HOT_LEAD" }],
      },
      orderBy: { lastMessageAt: "desc" },
      take: 6,
      select: {
        id: true,
        customerName: true,
        customerContact: true,
        channelType: true,
        summary: true,
        intentLabel: true,
        escalatedToHuman: true,
        lastMessageAt: true,
      },
    }),
    prisma.aiChannelConnection.findMany({
      where: {
        tenantId,
        status: { in: ["ERROR", "PENDING"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        channelType: true,
        accountLabel: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.aiTrainingJob.findMany({
      where: {
        tenantId,
        status: "FAILED",
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        status: true,
        summary: true,
        updatedAt: true,
      },
    }),
  ]);
  const platformReadSet = new Set(platformReadRows.map((row) => row.updateId));
  const adminReadSet = new Set(adminReadRows.map((row) => row.notificationId));
  const systemReadSet = new Set(systemReadRows.map((row) => row.notificationKey));

  const salesTodayAmount = Number(todaySales._sum.totalAmount ?? 0);
  const salesYesterdayAmount = Number(yesterdaySales._sum.totalAmount ?? 0);
  const salesDelta =
    salesYesterdayAmount > 0
      ? Math.round(((salesTodayAmount - salesYesterdayAmount) / salesYesterdayAmount) * 100)
      : salesTodayAmount > 0
        ? 100
        : 0;
  const leadsToday = conversationsToday + supportTicketsToday + customRequestsToday;
  const activeModules = modulesPayload.modules.filter((module) => module.isActive).length;
  const operationalScore = buildOperationalScore({
    businessActive: Boolean(businessModule?.isActive),
    labsActive: Boolean(labsModule?.isActive),
    activePages,
    connectedDomains,
    connectedChannels,
    knowledgeItems,
  });
  const hostingEndsAt = addDays(tenantRecord.createdAt, 365);
  const hostingDaysLeft = getDaysUntil(hostingEndsAt);
  const labsDaysLeft = subscription?.currentPeriodEndsAt
    ? getDaysUntil(subscription.currentPeriodEndsAt)
    : null;
  // Solo cuentas que siguen en prueba: a las que ya pagan no se les avisa del vencimiento del trial.
  const businessTrialDaysLeft =
    subscription?.billingStatus === "TRIAL" && subscription.trialEndsAt ? getDaysUntil(subscription.trialEndsAt) : null;
  const businessProjectLimit = subscription?.businessProjectLimit ?? 1;
  const labsProjectLimit = 1;
  const businessRemaining = Math.max(0, businessProjectLimit - activePages);
  const labsUsed = labsWorkspace ? 1 : 0;
  const labsRemaining = Math.max(0, labsProjectLimit - labsUsed);

  const systemHintIsRead = (id: string) =>
    systemReadSet.has(id) || systemReadSet.has(buildNotificationReadKey("system_hint", id));

  const labsSystemNotifications = buildLabsSystemNotifications({
    tenantId,
    conversations: labsNotificationConversations,
    channels: labsNotificationChannels,
    trainingJobs: labsNotificationTrainingJobs,
    readKeys: systemReadSet,
  });

  const notifications: ShellNotification[] = [
    ...activePlatformUpdates.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      href: item.href,
      tone: item.tone as "info" | "warning" | "danger",
      category: item.category as "platform" | "business" | "labs" | "billing",
      sourceLabel: (
        item.category === "business"
          ? "Vase Business"
          : item.category === "labs"
            ? "Vase Labs"
            : item.category === "billing"
              ? "Billing"
              : "Vase"
      ) as ShellNotification["sourceLabel"],
      createdAt: item.publishedAt,
      isPlatformUpdate: true,
      isRead: platformReadSet.has(item.id),
      notificationType: "platform_update" as const,
    })),
    ...adminTargetedNotifications
      .filter((item) => {
        if (item.target !== "USERS") return true;
        if (!userId) return false;
        const ids = Array.isArray(item.targetUserIds) ? item.targetUserIds : [];
        return ids.includes(userId);
      })
      .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.message,
      href: "/app",
      tone: (item.tone as "info" | "warning" | "danger") ?? "info",
      category: (item.category === "support" ? "platform" : item.category) as "platform" | "business" | "labs" | "billing",
      sourceLabel: "Vase" as const,
      createdAt: item.createdAt,
      isPlatformUpdate: false,
      isRead: adminReadSet.has(item.id),
      notificationType: "admin_notification" as const,
    })),
    ...labsSystemNotifications,
    ...(businessModule?.isActive && hostingDaysLeft <= 45
      ? [
          {
            id: "hosting-expiry",
            title: "Hosting anual próximo a vencer",
            description:
              hostingDaysLeft > 0
                ? `El hosting incluido de Vase Business vence en ${hostingDaysLeft} día(s).`
                : "El hosting incluido de Vase Business ya alcanzó su vencimiento estimado.",
            href: "/precios",
            tone: hostingDaysLeft <= 7 ? ("danger" as const) : ("warning" as const),
            category: "billing" as const,
            sourceLabel: "Billing" as const,
            createdAt: new Date(),
            isRead: systemHintIsRead("hosting-expiry"),
            notificationType: "system_hint" as const,
          },
        ]
      : []),
    ...(labsModule?.isActive && labsDaysLeft != null && labsDaysLeft <= 10
      ? [
          {
            id: "labs-period-expiry",
            title: "Vase Labs está por vencer",
            description:
              labsDaysLeft > 0
                ? `Tu período actual de Vase Labs vence en ${labsDaysLeft} día(s).`
                : "El período de Vase Labs ya venció o vence hoy.",
            href: "/precios",
            tone: labsDaysLeft <= 3 ? ("danger" as const) : ("warning" as const),
            category: "billing" as const,
            sourceLabel: "Billing" as const,
            createdAt: new Date(),
            isRead: systemHintIsRead("labs-period-expiry"),
            notificationType: "system_hint" as const,
          },
        ]
      : []),
    ...(subscription?.billingStatus === "PAST_DUE"
      ? [
          {
            id: "billing-past-due",
            title: "Facturación pendiente",
            description:
              "Hay una suscripción en estado pendiente de pago. Revísala para no interrumpir el servicio.",
            href: "/precios",
            tone: "danger" as const,
            category: "billing" as const,
            sourceLabel: "Billing" as const,
            createdAt: new Date(),
            isRead: systemHintIsRead("billing-past-due"),
            notificationType: "system_hint" as const,
          },
        ]
      : []),
    ...(businessTrialDaysLeft != null && businessTrialDaysLeft <= 7
      ? [
          {
            id: "business-trial-expiry",
            title: "Tu trial de Business esta por vencer",
            description:
              businessTrialDaysLeft > 0
                ? `Quedan ${businessTrialDaysLeft} dia(s) para activar tu plan.`
                : "El trial de Business ya vencio. Revisa tu configuracion para reactivar.",
            href: "/app/settings",
            tone: businessTrialDaysLeft <= 1 ? ("danger" as const) : ("warning" as const),
            category: "billing" as const,
            sourceLabel: "Billing" as const,
            createdAt: new Date(),
            isRead: systemHintIsRead("business-trial-expiry"),
            notificationType: "system_hint" as const,
          },
        ]
      : []),
  ]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 8);

  const recentEvents: Array<{
    id: string;
    title: string;
    description: string;
    occurredAt: Date;
    tone: "success" | "warning" | "danger";
  }> = [
    ...recentOrders.map((order) => ({
      id: `order-${order.id}`,
      title: `Pedido ${order.orderNumber}`,
      description: `Estado actual: ${formatStatusLabel(order.status)}`,
      occurredAt: order.createdAt,
      tone: asEventTone(order.status === "CANCELED" ? "danger" : "success"),
    })),
    ...recentDomains.map((domain) => ({
      id: `domain-${domain.id}`,
      title: `Dominio ${domain.hostname}`,
      description: `Estado de dominio: ${formatStatusLabel(domain.status)}`,
      occurredAt: domain.updatedAt,
      tone: asEventTone(
        domain.status === "CONNECTED"
          ? "success"
          : domain.status === "FAILED"
            ? "danger"
            : "warning"
      ),
    })),
    ...recentChannels.map((channel) => ({
      id: `channel-${channel.id}`,
      title: `${formatStatusLabel(channel.channelType)} conectado`,
      description: `${channel.accountLabel} · ${formatStatusLabel(channel.status)}`,
      occurredAt: channel.updatedAt,
      tone: asEventTone(
        channel.status === "CONNECTED"
          ? "success"
          : channel.status === "ERROR"
            ? "danger"
            : "warning"
      ),
    })),
    ...recentSupportTickets.map((ticket) => ({
      id: `support-${ticket.id}`,
      title: `Ticket: ${ticket.subject}`,
      description: `Soporte en ${formatStatusLabel(ticket.status)}`,
      occurredAt: ticket.updatedAt,
      tone: asEventTone(ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "success" : "warning"),
    })),
    ...recentTrainingJobs.map((job) => ({
      id: `training-${job.id}`,
      title: "Entrenamiento de IA",
      description: `Job ${formatStatusLabel(job.status)}`,
      occurredAt: job.updatedAt,
      tone: asEventTone(job.status === "READY" ? "success" : job.status === "FAILED" ? "danger" : "warning"),
    })),
  ]
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, 5);

  const recommendation = (() => {
    if (businessModule?.isActive && activePages === 0) {
      return {
        title: "Publica tu primera pagina",
        description: "Todavia no hay paginas activas dentro de Vase Business. Crear la primera web te destraba dominios, pedidos y visibilidad real.",
        ctaLabel: "Crear pagina",
        ctaHref: `${BUSINESS_WORKSPACE_PATH}#crear-pagina`,
      };
    }

    if (businessModule?.isActive && connectedDomains === 0) {
      return {
        title: "Conecta tu dominio",
        description: "Tus paginas ya existen, pero todavia no hay un dominio propio conectado. Eso mejora presencia y conversion.",
        ctaLabel: "Ver dominios",
        ctaHref: BUSINESS_WORKSPACE_PATH,
      };
    }

    if (labsModule?.isActive && knowledgeItems === 0) {
      return {
        title: "Carga conocimiento para la IA",
        description: "Vase Labs esta activo, pero todavia no hay FAQs, archivos o URLs cargadas. Sin eso, el asistente responde con mucho menos contexto.",
        ctaLabel: "Abrir Vase Labs",
        ctaHref: "/app/labs#ai-tools",
      };
    }

    if (labsModule?.isActive && connectedChannels === 0) {
      return {
        title: "Conecta un canal de atencion",
        description: "Tu workspace de Labs esta listo, pero todavia no hay canales conectados. WhatsApp, Instagram o webchat pueden activarse desde el panel.",
        ctaLabel: "Configurar canal",
        ctaHref: "/app/labs#integrations",
      };
    }

    const inactiveModule = modulesPayload.modules.find((module) => !module.isActive);

    if (inactiveModule) {
      return {
        title: `Activa ${inactiveModule.name}`,
        description: `Tu tenant ya esta usando parte del ecosistema Vase. Activar ${inactiveModule.name} suma una segunda capa operativa con datos y automatizacion conectados.`,
        ctaLabel: "Ver planes",
        ctaHref: inactiveModule.activationRoute,
      };
    }

    return {
      title: "Tu tenant ya esta bien conectado",
      description: "Los modulos activos ya tienen base operativa real. El siguiente paso es profundizar automatizaciones, integraciones y rendimiento comercial.",
      ctaLabel: "Ver modulos",
      ctaHref: "/app",
    };
  })();

  return {
    tenant: modulesPayload.tenant,
    modules: modulesPayload.modules,
    hero: {
      score: operationalScore,
      activeModules,
      totalModules: modulesPayload.modules.length,
    },
    commerce: {
      salesTodayAmount,
      salesDelta,
      pendingOrders,
      totalPages,
      activePages,
      totalDomains,
      connectedDomains,
    },
    labs: {
      leadsToday,
      knowledgeItems,
      totalChannels,
      connectedChannels,
      openConversations,
      trainingJobsReady,
    },
    support: {
      activeTickets: activeSupportTickets,
      ticketsToday: supportTicketsToday,
    },
    ecosystem: {
      enabledFeatureFlags,
      activeApiCredentials,
      activeWebhooks,
    },
    erp: {
      connected: inboundSyncRecords > 0,
      inboundSyncRecords,
    },
    projectCreation: {
      business: {
        limit: businessProjectLimit,
        used: activePages,
        remaining: businessRemaining,
        canCreate: businessRemaining > 0,
      },
      labs: {
        limit: labsProjectLimit,
        used: labsUsed,
        remaining: labsRemaining,
        canCreate: labsRemaining > 0,
      },
    },
    notifications: notifications.filter(
      (notification) =>
        !systemReadSet.has(
          buildDismissedNotificationKey(buildNotificationReadKey(notification.notificationType, notification.id)),
        ),
    ),
    recommendation,
    recentEvents,
  };
}

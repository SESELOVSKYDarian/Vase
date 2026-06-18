"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { persistHumanMessage, setConversationAiPaused } from "@/server/services/chatbot/conversation-state";
import { dispatchChannelReply } from "@/server/services/chatbot/channel-dispatch";
import { getLabsPlanLimits } from "@/lib/labs/plans";
import { assertSafeExternalUrl, sanitizeAllowedPathList } from "@/lib/security/external-requests";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { validateUpload } from "@/lib/security/upload";
import {
  assistantSettingsSchema,
  connectChannelSchema,
  createFaqKnowledgeSchema,
  createTrainingJobSchema,
  createUrlKnowledgeSchema,
  deleteChannelSchema,
  openWaQrActionSchema,
  sendHumanReplySchema,
  setConversationAiModeSchema,
} from "@/lib/validators/labs";
import { buildMetaOfficialChannelConfig, getMetaOfficialChannelStatus } from "@/lib/labs/channel-config";
import { createAuditLog } from "@/server/services/audit-log";
import { queueAiTrainingJob } from "@/server/services/labs-training";
import { createSecurityEvent } from "@/server/services/security-events";
import { ensureBaileysRuntime, getBaileysState, refreshBaileysQr } from "@/server/services/baileys-gateway";
import { resolveMetaWebhookVerifyToken } from "@/lib/integrations/meta-webhook";

export type LabsActionState = {
  success?: string;
  error?: string;
  info?: string;
  webhookUrl?: string;
  webhookVerifyToken?: string;
};

type OpenWaConfig = {
  provider: "OPENWA_UNOFFICIAL" | "BAILEYS_UNOFFICIAL";
  qrImageDataUrl?: string;
  qrLastFetchedAt?: string;
  connectionState?: string;
  failureReason?: string;
};

function isOpenWaConfigLike(config: Record<string, unknown>) {
  const provider = String(config.provider || "").toUpperCase();
  return provider === "OPENWA_UNOFFICIAL" || provider === "BAILEYS_UNOFFICIAL";
}

async function requireLabsWorkspace(tenantId: string) {
  const workspace = await prisma.tenantAiWorkspace.findUnique({
    where: { tenantId },
  });

  if (!workspace) {
    throw new Error("WORKSPACE_NOT_FOUND");
  }

  return workspace;
}

export async function updateLabsAssistantSettingsAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = assistantSettingsSchema.safeParse({
      assistantDisplayName: sanitizeText(String(formData.get("assistantDisplayName") ?? "")),
      tone: formData.get("tone"),
      timezone: sanitizeText(String(formData.get("timezone") ?? "")),
      hoursStart: String(formData.get("hoursStart") ?? ""),
      hoursEnd: String(formData.get("hoursEnd") ?? ""),
      humanEscalationEnabled: formData.get("humanEscalationEnabled") === "on",
      escalationDestination: formData.get("escalationDestination"),
      escalationContact: sanitizeNullableText(String(formData.get("escalationContact") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return {
        error: "Revisa tono, horarios y configuracion de escalamiento.",
      };
    }

    const workspace = await requireLabsWorkspace(membership.tenantId);
    const limits = getLabsPlanLimits(workspace.plan);

    if (parsed.data.tone === "PREMIUM" && !limits.canUsePremiumTone) {
      return {
        error: "Tu plan actual no habilita el tono premium del asistente.",
      };
    }

    await prisma.tenantAiWorkspace.update({
      where: { tenantId: membership.tenantId },
      data: {
        assistantDisplayName: parsed.data.assistantDisplayName,
        tone: parsed.data.tone,
        timezone: parsed.data.timezone,
        businessHours: {
          days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          hoursStart: parsed.data.hoursStart,
          hoursEnd: parsed.data.hoursEnd,
        } as Prisma.InputJsonValue,
        humanEscalationEnabled: parsed.data.humanEscalationEnabled,
        escalationDestination: parsed.data.escalationDestination,
        escalationContact: parsed.data.escalationContact,
        setupCompletedAt: new Date(),
      },
    });

    await createAuditLog({
      action: "labs.assistant_settings_updated",
      targetType: "tenant_ai_workspace",
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/owner/labs/setup");
    return {
      success: "Configuracion del asistente actualizada.",
    };
  } catch {
    return {
      error: "No pudimos guardar la configuracion del asistente.",
    };
  }
}

export async function uploadLabsKnowledgeFileAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const workspace = await requireLabsWorkspace(membership.tenantId);
    const file = formData.get("file");

    await enforceRateLimit({
      scope: "labs:file-upload",
      key: `${membership.tenantId}:${session.user.id}`,
      limit: 12,
      windowSeconds: 60 * 15,
    });

    if (!(file instanceof File) || file.size === 0) {
      return {
        error: "Selecciona un archivo valido para entrenar al asistente.",
      };
    }

    const metadata = await validateUpload(file);
    const fileCount = await prisma.aiKnowledgeItem.count({
      where: {
        tenantId: membership.tenantId,
        type: "FILE",
        status: {
          not: "ARCHIVED",
        },
      },
    });

    if (fileCount >= workspace.maxFiles) {
      return {
        error: `Tu plan permite hasta ${workspace.maxFiles} archivos en la base de conocimiento.`,
      };
    }

    await prisma.aiKnowledgeItem.create({
      data: {
        tenantId: membership.tenantId,
        workspaceId: workspace.id,
        createdByUserId: session.user.id,
        type: "FILE",
        status: "QUEUED",
        title: sanitizeText(metadata.originalName),
        fileName: metadata.originalName,
        mimeType: metadata.type,
        fileSizeBytes: metadata.size,
        storageKey: metadata.storageKey,
        contentSnippet: "Archivo cargado para entrenamiento y procesamiento posterior.",
      },
    });

    await queueAiTrainingJob(
      membership.tenantId,
      workspace.id,
      session.user.id,
      "Nuevo archivo agregado a la base de conocimiento.",
    );

    await createAuditLog({
      action: "labs.knowledge_file_uploaded",
      targetType: "ai_knowledge_item",
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        fileName: metadata.originalName,
        mimeType: metadata.type,
        scanResult: metadata.scan.result,
      },
    });

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/owner/labs/setup");
    return {
      success: "Archivo agregado a la cola de entrenamiento.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "FILE_TYPE_NOT_ALLOWED") {
      return { error: "Solo se permiten PNG, JPG, WEBP o PDF." };
    }

    if (error instanceof Error && error.message === "FILE_EXTENSION_NOT_ALLOWED") {
      return { error: "La extension del archivo no esta permitida." };
    }

    if (error instanceof Error && error.message === "FILE_SIGNATURE_INVALID") {
      return { error: "El archivo no coincide con el tipo declarado." };
    }

    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return { error: "El archivo supera el tamano permitido." };
    }

    if (error instanceof Error && error.message === "FILE_SCAN_UNAVAILABLE") {
      return { error: "El escaneo de seguridad del archivo no estuvo disponible." };
    }

    if (error instanceof Error && error.message === "FILE_MALWARE_DETECTED") {
      const requestContext = await getRequestContext();
      const session = await requireVerifiedUser();
      const { membership } = await requireTenantRole(tenantRoles.OWNER);

      await createSecurityEvent({
        event: "malicious_upload_rejected",
        severity: "critical",
        actorUserId: session.user.id,
        tenantId: membership.tenantId,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return { error: "El archivo fue rechazado por controles de seguridad." };
    }

    return {
      error: "No pudimos registrar el archivo ahora mismo.",
    };
  }
}

export async function createLabsFaqAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const workspace = await requireLabsWorkspace(membership.tenantId);
    const parsed = createFaqKnowledgeSchema.safeParse({
      question: sanitizeText(String(formData.get("question") ?? "")),
      answer: sanitizeText(String(formData.get("answer") ?? "")),
    });

    if (!parsed.success) {
      return {
        error: "Completa una pregunta y respuesta claras para entrenar al asistente.",
      };
    }

    const totalKnowledgeItems = await prisma.aiKnowledgeItem.count({
      where: {
        tenantId: membership.tenantId,
        status: {
          not: "ARCHIVED",
        },
      },
    });

    if (totalKnowledgeItems >= workspace.monthlyKnowledgeItemLimit) {
      return {
        error: `Tu plan admite hasta ${workspace.monthlyKnowledgeItemLimit} items activos de conocimiento.`,
      };
    }

    await prisma.aiKnowledgeItem.create({
      data: {
        tenantId: membership.tenantId,
        workspaceId: workspace.id,
        createdByUserId: session.user.id,
        type: "FAQ",
        status: "READY",
        title: parsed.data.question,
        faqQuestion: parsed.data.question,
        faqAnswer: parsed.data.answer,
        contentSnippet: parsed.data.answer.slice(0, 180),
        lastProcessedAt: new Date(),
      },
    });

    await queueAiTrainingJob(
      membership.tenantId,
      workspace.id,
      session.user.id,
      "Nueva FAQ agregada a la base de conocimiento.",
    );

    await createAuditLog({
      action: "labs.faq_created",
      targetType: "ai_knowledge_item",
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/owner/labs/setup");
    return {
      success: "FAQ agregada correctamente.",
    };
  } catch {
    return {
      error: "No pudimos guardar la FAQ ahora mismo.",
    };
  }
}

export async function createLabsUrlAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const workspace = await requireLabsWorkspace(membership.tenantId);
    const limits = getLabsPlanLimits(workspace.plan);
    const parsed = createUrlKnowledgeSchema.safeParse({
      sourceUrl: formData.get("sourceUrl"),
      allowedPaths: sanitizeNullableText(String(formData.get("allowedPaths") ?? "")) ?? undefined,
      title: sanitizeText(String(formData.get("title") ?? "")),
    });

    if (!parsed.success) {
      return {
        error: "Revisa el titulo, la URL y las rutas permitidas para scraping.",
      };
    }

    if (!limits.canUseScraping || !workspace.scrapingEnabled) {
      return {
        error: "Tu workspace no tiene scraping habilitado en este momento.",
      };
    }

    await enforceRateLimit({
      scope: "labs:url-create",
      key: `${membership.tenantId}:${session.user.id}`,
      limit: 20,
      windowSeconds: 60 * 15,
    });

    const safeUrl = assertSafeExternalUrl(parsed.data.sourceUrl);
    const allowedPaths = sanitizeAllowedPathList(parsed.data.allowedPaths);

    const urlCount = await prisma.aiKnowledgeItem.count({
      where: {
        tenantId: membership.tenantId,
        type: "URL",
        status: {
          not: "ARCHIVED",
        },
      },
    });

    if (urlCount >= workspace.maxUrls) {
      return {
        error: `Tu plan permite hasta ${workspace.maxUrls} URLs controladas.`,
      };
    }

    await prisma.aiKnowledgeItem.create({
      data: {
        tenantId: membership.tenantId,
        workspaceId: workspace.id,
        createdByUserId: session.user.id,
        type: "URL",
        status: "QUEUED",
        title: parsed.data.title,
        sourceUrl: safeUrl.toString(),
        allowedPaths: allowedPaths.length ? (allowedPaths as Prisma.InputJsonValue) : undefined,
        contentSnippet: "URL registrada para scraping controlado y revision posterior.",
      },
    });

    await queueAiTrainingJob(
      membership.tenantId,
      workspace.id,
      session.user.id,
      "Nueva URL registrada para scraping controlado.",
    );

    await createAuditLog({
      action: "labs.url_added",
      targetType: "ai_knowledge_item",
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        sourceUrl: safeUrl.toString(),
        allowedPaths,
      },
    });

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/owner/labs/setup");
    return {
      success: "URL agregada a la cola de revision y entrenamiento.",
    };
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "INVALID_EXTERNAL_URL",
        "EXTERNAL_URL_PROTOCOL_NOT_ALLOWED",
        "EXTERNAL_URL_PRIVATE_HOST",
        "EXTERNAL_URL_CREDENTIALS_NOT_ALLOWED",
        "SCRAPING_PATH_INVALID",
      ].includes(error.message)
    ) {
      const requestContext = await getRequestContext();
      const session = await requireVerifiedUser();
      const { membership } = await requireTenantRole(tenantRoles.OWNER);

      await createSecurityEvent({
        event: "unsafe_scraping_target_rejected",
        severity: "high",
        actorUserId: session.user.id,
        tenantId: membership.tenantId,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: {
          reason: error.message,
        },
      });

      return {
        error: "La URL o las rutas permitidas no cumplen las politicas de scraping seguro.",
      };
    }

    return {
      error: "No pudimos registrar la URL ahora mismo.",
    };
  }
}

export async function connectLabsChannelAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const readFormValue = (fieldName: string) => {
      const value = formData.get(fieldName);
      return typeof value === "string" ? value : undefined;
    };
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const workspace = await requireLabsWorkspace(membership.tenantId);
    const limits = getLabsPlanLimits(workspace.plan);
    const parsed = connectChannelSchema.safeParse({
      channelId: readFormValue("channelId"),
      channelType: readFormValue("channelType"),
      provider: readFormValue("provider"),
      accountLabel: sanitizeNullableText(readFormValue("accountLabel")) ?? undefined,
      externalHandle: sanitizeNullableText(readFormValue("externalHandle")) ?? undefined,
      notes: sanitizeNullableText(readFormValue("notes")) ?? undefined,
      accessToken: sanitizeNullableText(readFormValue("accessToken")) ?? undefined,
      phoneNumberId: sanitizeNullableText(readFormValue("phoneNumberId")) ?? undefined,
      appSecret: sanitizeNullableText(readFormValue("appSecret")) ?? undefined,
      verifyToken: sanitizeNullableText(readFormValue("verifyToken")) ?? undefined,
      openwaBaseUrl: sanitizeNullableText(readFormValue("openwaBaseUrl")) ?? undefined,
      openwaApiKey: sanitizeNullableText(readFormValue("openwaApiKey")) ?? undefined,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        error: firstIssue
          ? `Revisa ${firstIssue.path.join(".") || "el formulario"}: ${firstIssue.message}.`
          : "Revisa el canal, la cuenta y los datos de conexion.",
      };
    }

    if (parsed.data.channelType === "INSTAGRAM" && !limits.canUseInstagram) {
      return {
        error: "Instagram queda habilitado a partir de Labs Premium.",
      };
    }

    const isOpenWaFlow =
      parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "OPENWA_UNOFFICIAL";
    const editableChannel = parsed.data.channelId
      ? await prisma.aiChannelConnection.findFirst({
          where: {
            id: parsed.data.channelId,
            tenantId: membership.tenantId,
          },
        })
      : null;

    if (parsed.data.channelId && !editableChannel) {
      return {
        error: "No encontramos el canal para editar.",
      };
    }

    const existingOpenWaChannel = isOpenWaFlow
      ? (
          await prisma.aiChannelConnection.findMany({
            where: {
              tenantId: membership.tenantId,
              channelType: "WHATSAPP",
            },
            orderBy: { createdAt: "asc" },
          })
        ).find((item) => item.config && typeof item.config === "object" && isOpenWaConfigLike(item.config as Record<string, unknown>)) ?? null
      : null;

    const channelCount = await prisma.aiChannelConnection.count({
      where: {
        tenantId: membership.tenantId,
        status: {
          not: "DISCONNECTED",
        },
      },
    });

    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId: membership.tenantId },
      select: { labsAssistantLimit: true },
    });

    const assistantLimit = Math.max(1, subscription?.labsAssistantLimit ?? 1);
    const effectiveLimit = Math.min(workspace.maxChannels, assistantLimit);
    if (!editableChannel && !existingOpenWaChannel && channelCount >= effectiveLimit) {
      return {
        error: `Tu plan permite hasta ${effectiveLimit} asistente(s) o canal(es) activo(s) en Labs.`,
      };
    }

    const verifyToken = parsed.data.verifyToken || resolveMetaWebhookVerifyToken(membership.tenant.slug);
    let channelConfig: Prisma.InputJsonValue | undefined;
    let openWaQrAutoInfo: string | undefined;

    if (parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "OPENWA_UNOFFICIAL") {
      channelConfig = {
        provider: "BAILEYS_UNOFFICIAL",
        connectionState: "INITIALIZING",
      } as Prisma.InputJsonValue;
      openWaQrAutoInfo = "Canal Baileys creado. Usa Generar / Refrescar QR para vincular WhatsApp.";
    } else if (parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "META_OFFICIAL") {
      channelConfig = buildMetaOfficialChannelConfig({
        existingConfig:
          editableChannel?.config && typeof editableChannel.config === "object"
            ? (editableChannel.config as Record<string, unknown>)
            : undefined,
        accessToken: parsed.data.accessToken,
        phoneNumberId: parsed.data.phoneNumberId,
        appSecret: parsed.data.appSecret,
        verifyToken,
      }) as Prisma.InputJsonValue;
    }

    const status =
      parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "META_OFFICIAL"
        ? getMetaOfficialChannelStatus(channelConfig as ReturnType<typeof buildMetaOfficialChannelConfig>)
        : parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "OPENWA_UNOFFICIAL"
          ? (channelConfig as Record<string, unknown> | undefined)?.connectionState === "QR_READY"
            ? "PENDING"
            : "ERROR"
          : "PENDING";

    const accountLabel =
      parsed.data.accountLabel?.trim().length
        ? parsed.data.accountLabel.trim()
        : parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "OPENWA_UNOFFICIAL"
          ? `OpenWA-${randomBytes(3).toString("hex")}`
          : parsed.data.channelType === "WHATSAPP"
            ? `Meta-${membership.tenant.slug}`
            : `${parsed.data.channelType}-${membership.tenant.slug}`;

    const channel =
      editableChannel
        ? await prisma.aiChannelConnection.update({
            where: { id: editableChannel.id },
            data: {
              configuredByUserId: session.user.id,
              channelType: parsed.data.channelType,
              status,
              accountLabel,
              externalHandle: parsed.data.externalHandle,
              notes: parsed.data.notes,
              config: channelConfig,
            },
          })
        : existingOpenWaChannel && existingOpenWaChannel.config && typeof existingOpenWaChannel.config === "object"
        ? await prisma.aiChannelConnection.update({
            where: { id: existingOpenWaChannel.id },
            data: {
              configuredByUserId: session.user.id,
              status,
              accountLabel,
              externalHandle: parsed.data.externalHandle,
              notes: parsed.data.notes,
              config: channelConfig,
            },
          })
        : await prisma.aiChannelConnection.create({
            data: {
              tenantId: membership.tenantId,
              workspaceId: workspace.id,
              configuredByUserId: session.user.id,
              channelType: parsed.data.channelType,
              status,
              accountLabel,
              externalHandle: parsed.data.externalHandle,
              notes: parsed.data.notes,
              config: channelConfig,
            },
          });

    if (parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "OPENWA_UNOFFICIAL") {
      await ensureBaileysRuntime(channel.id);
    }

    await createAuditLog({
      action: "labs.channel_connected",
      targetType: "ai_channel_connection",
      targetId: channel.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        channelType: parsed.data.channelType,
        provider: parsed.data.provider,
      },
    });

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/owner/labs/setup");

    const webhookInfo =
      parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "META_OFFICIAL"
        ? `Webhook: /api/v1/channels/whatsapp/${membership.tenant.slug}/webhook · verify token: ${verifyToken}`
        : parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "OPENWA_UNOFFICIAL"
          ? `Proveedor no oficial: Baileys QR embebido. No requiere webhook externo de OpenWA.`
          : undefined;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
    const webhookPath = `/api/v1/channels/whatsapp/${membership.tenant.slug}/webhook`;
    const webhookUrl = appUrl ? `${appUrl}${webhookPath}` : webhookPath;

    return {
      success: status === "CONNECTED" ? "Canal conectado y operativo." : "Canal registrado en estado pendiente.",
      info: [webhookInfo, openWaQrAutoInfo].filter(Boolean).join(" · "),
      webhookUrl:
        parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "META_OFFICIAL"
          ? webhookUrl
          : undefined,
      webhookVerifyToken:
        parsed.data.channelType === "WHATSAPP" && parsed.data.provider === "META_OFFICIAL"
          ? verifyToken
          : undefined,
    };
  } catch {
    return {
      error: "No pudimos registrar el canal.",
    };
  }
}

export async function deleteLabsChannelAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = deleteChannelSchema.safeParse({
      channelId: formData.get("channelId"),
    });

    if (!parsed.success) {
      return { error: "No pudimos identificar el canal a eliminar." };
    }

    const channel = await prisma.aiChannelConnection.findFirst({
      where: {
        id: parsed.data.channelId,
        tenantId: membership.tenantId,
      },
    });

    if (!channel) {
      return { error: "El canal ya no existe o no pertenece a esta cuenta." };
    }

    await prisma.aiChannelConnection.update({
      where: { id: channel.id },
      data: {
        status: "DISCONNECTED",
      },
    });

    await createAuditLog({
      action: "labs.channel_deleted",
      targetType: "ai_channel_connection",
      targetId: channel.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        channelType: channel.channelType,
        accountLabel: channel.accountLabel,
      },
    });

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/owner/labs/setup");
    revalidatePath("/app/owner/labs/(advanced)/integrations");

    return { success: "Canal eliminado." };
  } catch {
    return { error: "No pudimos eliminar el canal." };
  }
}

export async function refreshOpenWaQrAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = openWaQrActionSchema.safeParse({
      channelId: formData.get("channelId"),
    });
    if (!parsed.success) {
      return { error: "No pudimos identificar el canal QR." };
    }

    const channel = await prisma.aiChannelConnection.findFirst({
      where: {
        id: parsed.data.channelId,
        tenantId: membership.tenantId,
        channelType: "WHATSAPP",
      },
    });
    if (!channel || !channel.config || typeof channel.config !== "object") {
      return { error: "Canal QR no configurado." };
    }

    const config = channel.config as Record<string, unknown>;
    if (!isOpenWaConfigLike(config)) {
      return { error: "Este canal no usa proveedor QR no oficial." };
    }

    const qrImageDataUrl = await refreshBaileysQr(channel.id);
    if (!qrImageDataUrl) {
      return { info: "Sesion iniciada. Si no aparece QR, espera unos segundos y vuelve a refrescar." };
    }

    const nextConfig: OpenWaConfig = {
      provider: "BAILEYS_UNOFFICIAL",
      qrImageDataUrl,
      qrLastFetchedAt: new Date().toISOString(),
      connectionState: "QR_READY",
    };

    await prisma.aiChannelConnection.update({
      where: { id: channel.id },
      data: {
        config: nextConfig as unknown as Prisma.InputJsonValue,
        status: "PENDING",
      },
    });

    await createAuditLog({
      action: "labs.openwa_qr_refreshed",
      targetType: "ai_channel_connection",
      targetId: channel.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
    });

    revalidatePath("/app/owner/labs/integrations");
    return { success: "QR actualizado. Escanealo desde WhatsApp." };
  } catch {
    return { error: "No pudimos refrescar el QR de Baileys." };
  }
}

export async function checkOpenWaConnectionAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = openWaQrActionSchema.safeParse({
      channelId: formData.get("channelId"),
    });
    if (!parsed.success) {
      return { error: "No pudimos identificar el canal QR." };
    }

    const channel = await prisma.aiChannelConnection.findFirst({
      where: {
        id: parsed.data.channelId,
        tenantId: membership.tenantId,
        channelType: "WHATSAPP",
      },
    });
    if (!channel || !channel.config || typeof channel.config !== "object") {
      return { error: "Canal QR no configurado." };
    }

    const config = channel.config as Record<string, unknown>;
    if (!isOpenWaConfigLike(config)) {
      return { error: "Este canal no usa proveedor QR no oficial." };
    }

    const statePayload = await getBaileysState(channel.id);
    const state = statePayload.connectionState.toUpperCase();
    const connected = ["CONNECTED", "OPEN"].some((value) => state.includes(value));

    const nextConfig: OpenWaConfig = {
      provider: "BAILEYS_UNOFFICIAL",
      qrImageDataUrl: statePayload.qrImageDataUrl,
      qrLastFetchedAt: typeof config.qrLastFetchedAt === "string" ? config.qrLastFetchedAt : undefined,
      connectionState: state,
      failureReason: statePayload.failureReason,
    };

    await prisma.aiChannelConnection.update({
      where: { id: channel.id },
      data: {
        status: connected ? "CONNECTED" : "PENDING",
        config: nextConfig as unknown as Prisma.InputJsonValue,
        connectedAt: connected ? new Date() : undefined,
      },
    });

    await createAuditLog({
      action: "labs.openwa_connection_checked",
      targetType: "ai_channel_connection",
      targetId: channel.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      metadata: { state, connected },
    });

    revalidatePath("/app/owner/labs/integrations");
    return connected
      ? { success: "Baileys conectado. Canal listo para usar." }
      : { info: `Sesion aun no conectada (estado: ${state}).` };
  } catch {
    return { error: "No pudimos verificar la conexion Baileys." };
  }
}

export async function sendHumanReplyAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = sendHumanReplySchema.safeParse({
      conversationId: formData.get("conversationId"),
      message: sanitizeText(String(formData.get("message") ?? "")),
    });

    if (!parsed.success) {
      return { error: "No pudimos validar el mensaje humano." };
    }

    const conversation = await prisma.aiConversation.findFirst({
      where: {
        id: parsed.data.conversationId,
        tenantId: membership.tenantId,
      },
      include: {
        workspace: true,
      },
    });

    if (!conversation || !conversation.customerContact) {
      return { error: "Conversacion no disponible para respuesta humana." };
    }

    const channel = await prisma.aiChannelConnection.findFirst({
      where: {
        tenantId: membership.tenantId,
        channelType: conversation.channelType,
        status: "CONNECTED",
      },
      orderBy: { createdAt: "asc" },
    });

    if (!channel || !channel.config || typeof channel.config !== "object") {
      return { error: "Canal no configurado para enviar mensajes." };
    }

    await dispatchChannelReply({
      channelType: conversation.channelType,
      channelId: channel.id,
      channelConfig: channel.config as Record<string, unknown>,
      customerContact: conversation.customerContact,
      text: parsed.data.message,
    });

    await persistHumanMessage({
      conversationId: conversation.id,
      metadata: conversation.metadata,
      humanMessage: parsed.data.message,
    });

    await setConversationAiPaused({
      conversationId: conversation.id,
      metadata: conversation.metadata,
      paused: true,
    });

    await createAuditLog({
      action: "labs.human_reply_sent",
      targetType: "ai_conversation",
      targetId: conversation.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
    });

    revalidatePath("/app/owner/labs/(advanced)/automation");
    revalidatePath("/app/owner/labs/(advanced)/activity");
    revalidatePath("/app/owner/labs/(advanced)/inbox");
    return { success: "Mensaje humano enviado. IA pausada para esta conversacion." };
  } catch {
    return { error: "No pudimos enviar el mensaje humano." };
  }
}

export async function setConversationAiModeAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = setConversationAiModeSchema.safeParse({
      conversationId: formData.get("conversationId"),
      paused: String(formData.get("paused") ?? "") === "true",
    });

    if (!parsed.success) {
      return { error: "No pudimos actualizar el estado de IA." };
    }

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: parsed.data.conversationId, tenantId: membership.tenantId },
    });

    if (!conversation) {
      return { error: "Conversacion no encontrada." };
    }

    await setConversationAiPaused({
      conversationId: conversation.id,
      metadata: conversation.metadata,
      paused: parsed.data.paused,
    });

    revalidatePath("/app/owner/labs/(advanced)/automation");
    revalidatePath("/app/owner/labs/(advanced)/activity");
    revalidatePath("/app/owner/labs/(advanced)/inbox");
    return { success: parsed.data.paused ? "IA pausada en la conversacion." : "IA reanudada en la conversacion." };
  } catch {
    return { error: "No pudimos cambiar el modo de IA." };
  }
}

export async function queueLabsTrainingAction(
  _: LabsActionState,
  formData: FormData,
): Promise<LabsActionState> {
  try {
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const workspace = await requireLabsWorkspace(membership.tenantId);
    const parsed = createTrainingJobSchema.safeParse({
      summary: sanitizeNullableText(String(formData.get("summary") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return {
        error: "No pudimos interpretar el resumen del entrenamiento.",
      };
    }

    await queueAiTrainingJob(
      membership.tenantId,
      workspace.id,
      session.user.id,
      parsed.data.summary,
    );

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/owner/labs/setup");
    return {
      success: "Entrenamiento enviado a cola.",
    };
  } catch {
    return {
      error: "No pudimos crear el entrenamiento ahora.",
    };
  }
}

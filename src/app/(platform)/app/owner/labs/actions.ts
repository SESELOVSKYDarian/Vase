"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
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
} from "@/lib/validators/labs";
import { createAuditLog } from "@/server/services/audit-log";
import { queueAiTrainingJob } from "@/server/services/labs-training";
import { createSecurityEvent } from "@/server/services/security-events";

export type LabsActionState = {
  success?: string;
  error?: string;
};

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
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const workspace = await requireLabsWorkspace(membership.tenantId);
    const limits = getLabsPlanLimits(workspace.plan);
    const parsed = connectChannelSchema.safeParse({
      channelType: formData.get("channelType"),
      accountLabel: sanitizeText(String(formData.get("accountLabel") ?? "")),
      externalHandle: sanitizeNullableText(String(formData.get("externalHandle") ?? "")) ?? undefined,
      notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return {
        error: "Revisa el canal, la cuenta y los datos de conexion.",
      };
    }

    if (parsed.data.channelType === "INSTAGRAM" && !limits.canUseInstagram) {
      return {
        error: "Instagram queda habilitado a partir de Labs Premium.",
      };
    }

    const channelCount = await prisma.aiChannelConnection.count({
      where: {
        tenantId: membership.tenantId,
        status: {
          not: "DISCONNECTED",
        },
      },
    });

    if (channelCount >= workspace.maxChannels) {
      return {
        error: `Tu plan permite hasta ${workspace.maxChannels} canales conectados.`,
      };
    }

    await prisma.aiChannelConnection.create({
      data: {
        tenantId: membership.tenantId,
        workspaceId: workspace.id,
        configuredByUserId: session.user.id,
        channelType: parsed.data.channelType,
        status: "PENDING",
        accountLabel: parsed.data.accountLabel,
        externalHandle: parsed.data.externalHandle,
        notes: parsed.data.notes,
      },
    });

    await createAuditLog({
      action: "labs.channel_connected",
      targetType: "ai_channel_connection",
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        channelType: parsed.data.channelType,
      },
    });

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/owner/labs/setup");
    return {
      success: "Canal registrado. Queda pendiente de validacion tecnica.",
    };
  } catch {
    return {
      error: "No pudimos registrar el canal.",
    };
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

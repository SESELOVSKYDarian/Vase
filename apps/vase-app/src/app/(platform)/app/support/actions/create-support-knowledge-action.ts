"use server";

// Parte de actions.ts: createSupportReplyTemplateAction, createSupportKnowledgeAction, updateSupportKnowledgeAction, deleteSupportKnowledgeAction, previewSupportKnowledgeReplyAction, recordSupportAiFeedbackAction.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createSupportKnowledgeSchema, createSupportReplyTemplateSchema, deleteSupportKnowledgeSchema, supportAiFeedbackSchema, updateSupportKnowledgeSchema } from "@/lib/validators/support";
import { createAuditLog } from "@/server/services/audit-log";
import { createSupportKnowledgeItem, deleteSupportKnowledgeItem, recordSupportAiFeedback, updateSupportKnowledgeItem } from "@/server/services/support-knowledge";
import { SupportActionState, parseKnowledgeTags } from "./support-action-state";

export async function createSupportReplyTemplateAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = createSupportReplyTemplateSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      body: sanitizeText(String(formData.get("body") ?? "")),
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, categoria y cuerpo de la respuesta predefinida." };
    }

    const template = await prisma.supportReplyTemplate.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        body: parsed.data.body,
        createdByUserId: session.user.id,
      },
    });

    await createAuditLog({
      action: "support.reply_template_created",
      targetType: "support_reply_template",
      targetId: template.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    revalidatePath("/app/admin");
    return { success: "Respuesta predefinida creada." };
  } catch {
    return { error: "No pudimos crear la respuesta predefinida." };
  }
}

export async function createSupportKnowledgeAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = createSupportKnowledgeSchema.safeParse({
      tenantId: sanitizeNullableText(String(formData.get("tenantId") ?? "")) ?? undefined,
      question: sanitizeText(String(formData.get("question") ?? "")),
      answer: sanitizeText(String(formData.get("answer") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      tags: parseKnowledgeTags(String(formData.get("tags") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa tenant, pregunta, respuesta, categoria y etiquetas." };
    }

    const item = await createSupportKnowledgeItem({
      ...parsed.data,
      createdByUserId: session.user.id,
    });

    await createAuditLog({
      action: "support.knowledge_created",
      targetType: "support_knowledge_item",
      targetId: item.id,
      tenantId: item.tenantId ?? undefined,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    revalidatePath("/app/support/knowledge");
    revalidatePath("/app/admin/support");
    return { success: "FAQ guardada correctamente." };
  } catch {
    return { error: "No pudimos guardar la FAQ." };
  }
}

export async function updateSupportKnowledgeAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = updateSupportKnowledgeSchema.safeParse({
      knowledgeId: formData.get("knowledgeId"),
      tenantId: sanitizeNullableText(String(formData.get("tenantId") ?? "")) ?? undefined,
      question: sanitizeText(String(formData.get("question") ?? "")),
      answer: sanitizeText(String(formData.get("answer") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      tags: parseKnowledgeTags(String(formData.get("tags") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa los datos antes de actualizar la FAQ." };
    }

    const item = await updateSupportKnowledgeItem(parsed.data);

    await createAuditLog({
      action: "support.knowledge_updated",
      targetType: "support_knowledge_item",
      targetId: item.id,
      tenantId: item.tenantId ?? undefined,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    revalidatePath("/app/support/knowledge");
    revalidatePath("/app/admin/support");
    return { success: "FAQ actualizada." };
  } catch {
    return { error: "No pudimos actualizar la FAQ." };
  }
}

export async function deleteSupportKnowledgeAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = deleteSupportKnowledgeSchema.safeParse({
      knowledgeId: formData.get("knowledgeId"),
    });

    if (!parsed.success) {
      return { error: "No pudimos identificar la FAQ." };
    }

    const item = await deleteSupportKnowledgeItem({
      knowledgeId: parsed.data.knowledgeId,
      actorPlatformRole:
        session.user.platformRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "SUPPORT",
    });

    await createAuditLog({
      action: "support.knowledge_deleted",
      targetType: "support_knowledge_item",
      targetId: item.id,
      tenantId: item.tenantId ?? undefined,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    revalidatePath("/app/support/knowledge");
    revalidatePath("/app/admin/support");
    return { success: "FAQ eliminada." };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_GLOBAL_DELETE") {
      return { error: "Solo un master admin puede eliminar FAQs globales." };
    }

    return { error: "No pudimos eliminar la FAQ." };
  }
}

export async function previewSupportKnowledgeReplyAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const message = sanitizeText(String(formData.get("message") ?? ""));
    const tenantId = sanitizeNullableText(String(formData.get("tenantId") ?? "")) ?? undefined;

    if (!message) {
      return { error: "Escribe una consulta para probar la respuesta asistida por FAQs." };
    }

    const { generateSupportAiReply } = await import("@/server/services/support-ai");
    const result = await generateSupportAiReply({
      message,
      tenantId,
      requestedByUserId: session.user.id,
    });

    return {
      success: "Respuesta generada con la base de conocimiento actual.",
      reply: result.reply,
      knowledgeItemCount: result.knowledgeItems.length,
      responseLogId: result.responseLogId,
    };
  } catch {
    return { error: "No pudimos generar una respuesta asistida por IA." };
  }
}

export async function recordSupportAiFeedbackAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = supportAiFeedbackSchema.safeParse({
      responseLogId: formData.get("responseLogId"),
      helpful: String(formData.get("helpful") ?? "") === "true",
      feedbackNote: sanitizeNullableText(String(formData.get("feedbackNote") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return { error: "No pudimos registrar el feedback de la respuesta." };
    }

    await recordSupportAiFeedback(parsed.data);

    return {
      success: parsed.data.helpful
        ? "Marcaste la respuesta como útil."
        : "Marcaste la respuesta como no útil.",
    };
  } catch {
    return { error: "No pudimos guardar el feedback." };
  }
}

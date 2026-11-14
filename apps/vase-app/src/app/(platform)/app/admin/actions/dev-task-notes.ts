"use server";

// Comentarios y adjuntos de una tarea de desarrollo.
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";
import { addDevTaskCommentSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { validateUpload } from "@/lib/security/upload";
import { saveLocalUpload } from "@/lib/storage/local-upload";
import { AdminGovernanceActionState } from "./shared";

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

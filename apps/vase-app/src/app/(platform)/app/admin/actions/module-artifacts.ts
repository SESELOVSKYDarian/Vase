"use server";

// Paquetes de un módulo: subir y publicar.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { publishModuleArtifactSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { saveLocalUpload } from "@/lib/storage/local-upload";
import { AdminGovernanceActionState, sanitizeModuleVersion, validateModuleZip } from "./shared";

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

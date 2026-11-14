"use server";

// Volver un proyecto a medida a su versión anterior.
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { rollbackCustomProjectDeploymentSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { rollbackCustomSitePackage } from "@/server/services/custom-site-packages";
import { AdminGovernanceActionState, formatDurationMs } from "./shared";

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

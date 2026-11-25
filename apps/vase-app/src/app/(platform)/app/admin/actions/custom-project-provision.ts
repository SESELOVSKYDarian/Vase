"use server";

// Publicar el sitio de un proyecto a medida.
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { createInitialBuilderDocument } from "@/lib/business/builder";
import { normalizeCustomProjectSlug, resolveCustomProjectSlug } from "@/lib/business/custom-project";
import { prisma } from "@/lib/db/prisma";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { provisionCustomProjectSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { saveLocalUpload } from "@/lib/storage/local-upload";
import { createCustomStaticSiteManifest, downloadGithubRepositoryZip, extractCustomSitePackage, type CustomSitePackageSource } from "@/server/services/custom-site-packages";
import { AdminGovernanceActionState, describeCustomSitePackageError, formatDurationMs, validateDownloadedZip, validateModuleZip } from "./shared";

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
        // La clave tiene que estar cargada en el servidor: antes había una escrita en el código
        // y cualquiera que la viera podía hacerse pasar por Vase.
        const webhookSecret = process.env.VASE_WEBHOOK_SECRET?.trim();
        if (!webhookSecret) throw new Error("VASE_WEBHOOK_SECRET_NOT_CONFIGURED");

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

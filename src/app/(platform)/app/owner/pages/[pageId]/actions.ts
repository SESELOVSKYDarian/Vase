"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import {
  getBuilderCapabilities,
  normalizeBuilderDocument,
  type BuilderDocument,
} from "@/lib/business/builder";
import { sanitizeBuilderDocument } from "@/lib/business/builder-sanitize";
import { getEffectivePlan } from "@/lib/business/plans";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import {
  createBuilderVersionSchema,
  createFullCustomizationRequestSchema,
  publishBuilderSchema,
  saveBuilderDraftSchema,
} from "@/lib/validators/builder";
import { createAuditLog } from "@/server/services/audit-log";

export type BuilderActionResult = {
  success?: string;
  error?: string;
  savedAt?: string;
};

async function getEditablePage(tenantId: string, pageId: string) {
  return prisma.storefrontPage.findFirst({
    where: {
      id: pageId,
      tenantId,
    },
    include: {
      versions: {
        select: {
          id: true,
          versionNumber: true,
          kind: true,
          createdAt: true,
        },
        orderBy: { versionNumber: "desc" },
      },
    },
  });
}

export async function saveBuilderDraftAction(input: unknown): Promise<BuilderActionResult> {
  try {
    await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = saveBuilderDraftSchema.safeParse(input);

    if (!parsed.success) {
      return {
        error: "No pudimos guardar los cambios. Revisa el contenido del editor.",
      };
    }

    const [page, subscription] = await Promise.all([
      getEditablePage(membership.tenantId, parsed.data.pageId),
      prisma.tenantSubscription.findUnique({
        where: { tenantId: membership.tenantId },
      }),
    ]);

    if (!page) {
      return {
        error: "La pagina no existe o no pertenece a tu negocio.",
      };
    }

    const capabilities = getBuilderCapabilities({
      isTemporary: page.isTemporary,
      plan: getEffectivePlan(subscription).plan,
    });
    const document = normalizeBuilderDocument(
      sanitizeBuilderDocument(parsed.data.document),
      capabilities,
    );

    await prisma.storefrontPage.update({
      where: { id: page.id },
      data: {
        templateKey: document.templateKey,
        builderDocument: document as Prisma.InputJsonValue,
        builderLastSavedAt: new Date(),
      },
    });

    revalidatePath(`/app/owner/pages/${page.id}`);
    return {
      success: "Cambios guardados automaticamente.",
      savedAt: new Date().toISOString(),
    };
  } catch {
    return {
      error: "No pudimos guardar automaticamente en este momento.",
    };
  }
}

export async function createBuilderVersionAction(
  input: unknown,
): Promise<BuilderActionResult> {
  try {
    const requestContext = await getRequestContext();
    const verifiedSession = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = createBuilderVersionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        error: "Escribe un resumen breve para guardar esta version.",
      };
    }

    const [page, subscription] = await Promise.all([
      getEditablePage(membership.tenantId, parsed.data.pageId),
      prisma.tenantSubscription.findUnique({
        where: { tenantId: membership.tenantId },
      }),
    ]);

    if (!page || !page.builderDocument) {
      return {
        error: "No encontramos una base guardada para crear la version.",
      };
    }

    const capabilities = getBuilderCapabilities({
      isTemporary: page.isTemporary,
      plan: getEffectivePlan(subscription).plan,
    });
    const currentDocument = normalizeBuilderDocument(
      sanitizeBuilderDocument(page.builderDocument as BuilderDocument),
      capabilities,
    );
    const nextVersion = (page.versions[0]?.versionNumber ?? 0) + 1;

    await prisma.$transaction(async (tx) => {
      await tx.storefrontPageVersion.create({
        data: {
          storefrontPageId: page.id,
          createdByUserId: verifiedSession.user.id,
          versionNumber: nextVersion,
          kind: "MANUAL",
          changeSummary: sanitizeText(parsed.data.changeSummary),
          snapshot: currentDocument as Prisma.InputJsonValue,
        },
      });

      const versions = await tx.storefrontPageVersion.findMany({
        where: { storefrontPageId: page.id },
        orderBy: { versionNumber: "desc" },
        select: { id: true },
      });

      const staleVersions = versions.slice(capabilities.maxSavedVersions);

      if (staleVersions.length > 0) {
        await tx.storefrontPageVersion.deleteMany({
          where: {
            id: {
              in: staleVersions.map((item) => item.id),
            },
          },
        });
      }
    });

    await createAuditLog({
      action: "business.builder_version_created",
      targetType: "storefront_page_version",
      targetId: page.id,
      tenantId: membership.tenantId,
      actorUserId: verifiedSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        pageId: page.id,
        versionNumber: nextVersion,
        changeSummary: parsed.data.changeSummary,
      },
    });

    revalidatePath(`/app/owner/pages/${page.id}`);
    return {
      success: `Version ${nextVersion} guardada correctamente.`,
    };
  } catch {
    return {
      error: "No pudimos crear la version ahora mismo.",
    };
  }
}

export async function publishBuilderPageAction(input: unknown): Promise<BuilderActionResult> {
  try {
    const requestContext = await getRequestContext();
    const verifiedSession = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = publishBuilderSchema.safeParse(input);

    if (!parsed.success) {
      return {
        error: "No pudimos reconocer la pagina a publicar.",
      };
    }

    const page = await getEditablePage(membership.tenantId, parsed.data.pageId);

    if (!page || !page.builderDocument) {
      return {
        error: "La pagina aun no tiene una version editable lista para publicar.",
      };
    }

    const nextVersion = (page.versions[0]?.versionNumber ?? 0) + 1;

    await prisma.$transaction(async (tx) => {
      await tx.storefrontPageVersion.create({
        data: {
          storefrontPageId: page.id,
          createdByUserId: verifiedSession.user.id,
          versionNumber: nextVersion,
          kind: "PUBLISHED",
          changeSummary: "Publicacion desde el editor de Vase Business.",
          snapshot: page.builderDocument as Prisma.InputJsonValue,
        },
      });

      await tx.storefrontPage.update({
        where: { id: page.id },
        data: {
          status: page.isTemporary ? "TEMPORARY" : "ACTIVE",
          publishedAt: new Date(),
        },
      });
    });

    await createAuditLog({
      action: "business.builder_published",
      targetType: "storefront_page",
      targetId: page.id,
      tenantId: membership.tenantId,
      actorUserId: verifiedSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        pageId: page.id,
        versionNumber: nextVersion,
      },
    });

    revalidatePath(`/app/owner/pages/${page.id}`);
    revalidatePath("/app/owner");
    return {
      success: "Publicaste la pagina y registramos una version publicada.",
    };
  } catch {
    return {
      error: "No pudimos publicar la pagina ahora.",
    };
  }
}

export async function submitFullCustomizationRequestAction(
  input: unknown,
): Promise<BuilderActionResult> {
  try {
    const requestContext = await getRequestContext();
    const verifiedSession = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);
    const parsed = createFullCustomizationRequestSchema.safeParse(input);

    if (!parsed.success) {
      return {
        error: "Completa todos los campos principales para enviar la solicitud.",
      };
    }

    const page = await prisma.storefrontPage.findFirst({
      where: {
        id: parsed.data.pageId,
        tenantId: membership.tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!page) {
      return {
        error: "No encontramos la pagina para asociar la personalizacion.",
      };
    }

    const businessDescription = sanitizeText(parsed.data.businessDescription);
    const desiredColors = sanitizeText(parsed.data.desiredColors);
    const brandStyle = sanitizeText(parsed.data.brandStyle);
    const desiredFeatures = sanitizeText(parsed.data.desiredFeatures);
    const visualReferences = sanitizeNullableText(parsed.data.visualReferences);
    const observations = sanitizeNullableText(parsed.data.observations);

    await prisma.customPageRequest.create({
      data: {
        tenantId: membership.tenantId,
        storefrontPageId: page.id,
        requesterUserId: verifiedSession.user.id,
        requestType: "FULL_CUSTOMIZATION",
        businessObjective: desiredFeatures,
        pageScope: `Personalizacion completa para ${page.name}`,
        businessDescription,
        desiredColors,
        brandStyle,
        desiredFeatures,
        visualReferences,
        observations,
        designReferences: visualReferences,
        notes: observations,
        premiumRequested: true,
        status: "SUBMITTED",
      },
    });

    await createAuditLog({
      action: "business.full_customization_requested",
      targetType: "custom_page_request",
      targetId: page.id,
      tenantId: membership.tenantId,
      actorUserId: verifiedSession.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        pageId: page.id,
      },
    });

    revalidatePath(`/app/owner/pages/${page.id}`);
    revalidatePath("/app/admin");
    return {
      success: "La solicitud premium ya esta en revision del equipo Vase.",
    };
  } catch {
    return {
      error: "No pudimos enviar la solicitud de personalizacion completa.",
    };
  }
}

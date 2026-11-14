"use server";

// Parte de actions.ts: createStorefrontPageAction, deleteStorefrontPagesAction.
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { type AuthActionState } from "@/app/(auth)/actions";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { createInitialBuilderDocument } from "@/lib/business/builder";
import { calculateTemporaryLifecycle } from "@/lib/business/lifecycle";
import { canCreateStorefrontPage, getEffectivePlan, resolveBusinessWebLimit } from "@/lib/business/plans";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createStorefrontPageSchema, deleteStorefrontPagesSchema } from "@/lib/validators/business";
import { createAuditLog } from "@/server/services/audit-log";
import { validationErrorState } from "./ensure-project-created-from-accepted-quote";

export async function createStorefrontPageAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.OWNER);
  const businessSubmodules = await prisma.moduleSubmodule.findMany({
    where: { moduleId: "vase_business", isActive: true },
    select: {
      key: true,
      tenantLinks: {
        where: { tenantId: membership.tenantId },
        select: { isActive: true },
        take: 1,
      },
    },
  });
  const hasExplicitBusinessSubmoduleAccess = businessSubmodules.some((submodule) => submodule.tenantLinks.length > 0);
  const canUseTemplateBusiness =
    !hasExplicitBusinessSubmoduleAccess ||
    businessSubmodules.some((submodule) => submodule.key === "plantilla" && submodule.tenantLinks.some((link) => link.isActive));

  if (!canUseTemplateBusiness) {
    return { error: "Tu cuenta no tiene habilitado el submodulo plantilla de Vase Business." };
  }

  const parsed = createStorefrontPageSchema.safeParse({
    name: sanitizeText(String(formData.get("name") ?? "")),
    description: sanitizeNullableText(String(formData.get("description") ?? "")),
    pageMode: formData.get("pageMode"),
  });

  if (!parsed.success) {
    return validationErrorState(parsed.error.flatten().fieldErrors);
  }

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId: membership.tenantId },
  });
  const currentPages = await prisma.storefrontPage.findMany({
    where: { tenantId: membership.tenantId },
    select: { status: true },
  });
  const effectivePlan = getEffectivePlan(subscription);

  if (!canCreateStorefrontPage(currentPages, effectivePlan)) {
    const limit = resolveBusinessWebLimit(effectivePlan);
    return {
      error: limit === 1 ? "Tu cuenta permite 1 web." : `Tu cuenta permite hasta ${limit} webs.`,
    };
  }

  const isTemporary = parsed.data.pageMode === "TEMPORARY";
  const templateKey = isTemporary ? "STARTER" : "CATALOG";

  if (isTemporary && !effectivePlan.temporaryPagesEnabled) {
    return {
      error: "Tu plan actual no permite paginas temporales.",
    };
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const lifecycle = isTemporary ? calculateTemporaryLifecycle() : null;
  const builderDocument = createInitialBuilderDocument(templateKey);

  try {
    await prisma.$transaction(async (tx) => {
      const page = await tx.storefrontPage.create({
        data: {
          tenantId: membership.tenantId,
          createdByUserId: verifiedSession.user.id,
          name: parsed.data.name,
          slug,
          description: parsed.data.description,
          templateKey,
          builderDocument,
          builderLastSavedAt: new Date(),
          status: isTemporary ? "TEMPORARY" : "ACTIVE",
          isTemporary,
          expiresAt: lifecycle?.expiresAt,
          graceEndsAt: lifecycle?.graceEndsAt,
          publishedAt: new Date(),
        },
      });

      await tx.storefrontPageVersion.create({
        data: {
          storefrontPageId: page.id,
          createdByUserId: verifiedSession.user.id,
          versionNumber: 1,
          kind: "MANUAL",
          changeSummary: "Version inicial generada desde la plantilla base.",
          snapshot: builderDocument,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Ya existe una pagina con un nombre muy parecido. Elige otro nombre.",
      };
    }

    return {
      error: "No pudimos crear la pagina en este momento.",
    };
  }

  await createAuditLog({
    action: "business.page_created",
    targetType: "storefront_page",
    tenantId: membership.tenantId,
    actorUserId: verifiedSession.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      slug,
      temporary: isTemporary,
    },
  });

  revalidatePath("/app/owner");
  return {
    success: isTemporary
      ? "Pagina temporal creada. Tendras 30 dias de actividad y 7 dias de gracia."
      : "Pagina creada correctamente.",
  };
}

export async function deleteStorefrontPagesAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestContext = await getRequestContext();
  const verifiedSession = await requireVerifiedUser();
  const { membership } = await requireTenantRole(tenantRoles.OWNER);

  await enforceRateLimit({
    scope: "business:page-delete",
    key: `${requestContext.ipAddress}:${membership.tenantId}:${verifiedSession.user.id}`,
    limit: 20,
    windowSeconds: 60 * 30,
  });

  const parsed = deleteStorefrontPagesSchema.safeParse({
    pageIds: formData.getAll("pageIds"),
  });

  if (!parsed.success) {
    return {
      error: "Selecciona al menos una pagina valida para eliminar.",
    };
  }

  const uniquePageIds = [...new Set(parsed.data.pageIds)];
  const pages = await prisma.storefrontPage.findMany({
    where: {
      tenantId: membership.tenantId,
      id: { in: uniquePageIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (pages.length === 0) {
    return {
      error: "No encontramos las paginas seleccionadas dentro de este tenant.",
    };
  }

  await prisma.storefrontPage.deleteMany({
    where: {
      tenantId: membership.tenantId,
      id: { in: pages.map((page) => page.id) },
    },
  });

  await createAuditLog({
    action: "business.pages_deleted",
    targetType: "storefront_page",
    tenantId: membership.tenantId,
    actorUserId: verifiedSession.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      deletedCount: pages.length,
      pageIds: pages.map((page) => page.id),
      pageNames: pages.map((page) => page.name),
    },
  });

  revalidatePath("/app/owner");
  return {
    success:
      pages.length === 1
        ? "Pagina eliminada correctamente."
        : `${pages.length} paginas eliminadas correctamente.`,
  };
}

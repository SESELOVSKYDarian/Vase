"use server";

// Parte de wiki.ts: createWikiDocumentAction, upsertFaqItemByAdminAction, deleteFaqItemByAdminAction, updateWikiDocumentMetaAction, addWikiSectionAction.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { addWikiSectionSchema, createWikiDocumentSchema, deleteFaqItemSchema, updateWikiDocumentMetaSchema, upsertFaqItemSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "../shared";

export async function createWikiDocumentAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = createWikiDocumentSchema.safeParse({
      title: sanitizeText(String(formData.get("title") ?? "")),
      slug: sanitizeText(String(formData.get("slug") ?? "")),
      summary: sanitizeNullableText(String(formData.get("summary") ?? "")) ?? undefined,
      status: formData.get("status"),
      sectionTitle: sanitizeText(String(formData.get("sectionTitle") ?? "")),
      sectionBody: sanitizeText(String(formData.get("sectionBody") ?? "")),
    });
    if (!parsed.success) return { error: "Revisa los campos de wiki/documentacion." };

    const doc = await prisma.wikiDocument.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        summary: parsed.data.summary ?? null,
        status: parsed.data.status,
        createdByUserId: adminSession.user.id,
        sections: {
          create: {
            title: parsed.data.sectionTitle,
            body: parsed.data.sectionBody,
            sortOrder: 0,
          },
        },
      },
    });

    await prisma.wikiRevision.create({
      data: {
        documentId: doc.id,
        changedByUserId: adminSession.user.id,
        summary: "Documento inicial creado desde Master Admin.",
        snapshot: {
          title: parsed.data.title,
          slug: parsed.data.slug,
          sectionTitle: parsed.data.sectionTitle,
        },
      },
    });
    revalidatePath("/app/admin");
    revalidatePath("/developers/docs");
    return { success: "Documento wiki creado correctamente." };
  } catch {
    return { error: "No pudimos crear el documento wiki." };
  }
}

export async function upsertFaqItemByAdminAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.FAQS);
    const parsed = upsertFaqItemSchema.safeParse({
      id: String(formData.get("id") ?? "").trim() || undefined,
      question: sanitizeText(String(formData.get("question") ?? "")),
      answer: sanitizeText(String(formData.get("answer") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return { error: "Datos invalidos para FAQ." };

    const payload = {
      tenantId: null,
      question: parsed.data.question,
      answer: parsed.data.answer,
      category: parsed.data.category ?? null,
      tags: parsed.data.tags,
      isActive: parsed.data.isActive,
      createdByUserId: adminSession.user.id,
    };

    if (parsed.data.id) {
      await prisma.supportKnowledgeItem.update({
        where: { id: parsed.data.id },
        data: {
          question: payload.question,
          answer: payload.answer,
          category: payload.category,
          tags: payload.tags,
          isActive: payload.isActive,
        },
      });
    } else {
      await prisma.supportKnowledgeItem.create({ data: payload });
    }

    await createAuditLog({
      action: parsed.data.id ? "platform.faq_updated" : "platform.faq_created",
      targetType: "support_knowledge_item",
      targetId: parsed.data.id,
      actorUserId: adminSession.user.id,
      metadata: { category: parsed.data.category ?? null },
    });
    revalidatePath("/app/admin/faqs");
    revalidatePath("/app/admin/support");
    return { success: parsed.data.id ? "FAQ actualizada." : "FAQ creada." };
  } catch {
    return { error: "No pudimos guardar la FAQ." };
  }
}

export async function deleteFaqItemByAdminAction(formData: FormData): Promise<void> {
  const adminSession = await requireAdminPermission(adminPermissions.FAQS);
  const parsed = deleteFaqItemSchema.safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) return;

  await prisma.supportKnowledgeItem.delete({ where: { id: parsed.data.id } });
  await createAuditLog({
    action: "platform.faq_deleted",
    targetType: "support_knowledge_item",
    targetId: parsed.data.id,
    actorUserId: adminSession.user.id,
  });
  revalidatePath("/app/admin/faqs");
  revalidatePath("/app/admin/support");
}

export async function updateWikiDocumentMetaAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.WIKI);
    const parsed = updateWikiDocumentMetaSchema.safeParse({
      documentId: formData.get("documentId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      slug: sanitizeText(String(formData.get("slug") ?? "")),
      summary: sanitizeNullableText(String(formData.get("summary") ?? "")) ?? undefined,
      status: formData.get("status"),
    });
    if (!parsed.success) return { error: "Datos invalidos para actualizar documentacion." };

    const previousDocument = await prisma.wikiDocument.findUnique({
      where: { id: parsed.data.documentId },
      select: { title: true, slug: true, summary: true, status: true },
    });

    await prisma.wikiDocument.update({
      where: { id: parsed.data.documentId },
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        summary: parsed.data.summary ?? null,
        status: parsed.data.status,
      },
    });
    await prisma.wikiRevision.create({
      data: {
        documentId: parsed.data.documentId,
        changedByUserId: adminSession.user.id,
        summary: "Metadatos de documento actualizados.",
        snapshot: parsed.data,
      },
    });
    await createAuditLog({
      action: "platform.wiki_document_meta_updated",
      targetType: "wiki_document",
      targetId: parsed.data.documentId,
      actorUserId: adminSession.user.id,
      metadata: {
        before: previousDocument,
        after: {
          title: parsed.data.title,
          slug: parsed.data.slug,
          summary: parsed.data.summary ?? null,
          status: parsed.data.status,
        },
      },
    });
    revalidatePath("/app/admin/wiki");
    revalidatePath(`/developers/docs/${parsed.data.slug}`);
    revalidatePath("/developers/docs");
    return { success: "Documento actualizado." };
  } catch {
    return { error: "No pudimos actualizar el documento." };
  }
}

export async function addWikiSectionAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.WIKI);
    const parsed = addWikiSectionSchema.safeParse({
      documentId: formData.get("documentId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      body: sanitizeText(String(formData.get("body") ?? "")),
    });
    if (!parsed.success) return { error: "Seccion invalida." };

    const lastSection = await prisma.wikiSection.findFirst({
      where: { documentId: parsed.data.documentId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await prisma.wikiSection.create({
      data: {
        documentId: parsed.data.documentId,
        title: parsed.data.title,
        body: parsed.data.body,
        sortOrder: (lastSection?.sortOrder ?? -1) + 1,
      },
    });
    await createAuditLog({
      action: "platform.wiki_section_added",
      targetType: "wiki_document",
      targetId: parsed.data.documentId,
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin/wiki");
    return { success: "Seccion agregada." };
  } catch {
    return { error: "No pudimos agregar la seccion." };
  }
}

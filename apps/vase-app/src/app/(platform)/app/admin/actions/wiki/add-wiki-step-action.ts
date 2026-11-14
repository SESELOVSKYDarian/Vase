"use server";

// Parte de wiki.ts: addWikiStepAction, addWikiDiscussionAction.
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";
import { addWikiDiscussionSchema, addWikiStepSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "../shared";

export async function addWikiStepAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.WIKI);
    const parsed = addWikiStepSchema.safeParse({
      sectionId: formData.get("sectionId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      content: sanitizeText(String(formData.get("content") ?? "")),
    });
    if (!parsed.success) return { error: "Paso invalido." };

    const lastStep = await prisma.wikiStep.findFirst({
      where: { sectionId: parsed.data.sectionId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await prisma.wikiStep.create({
      data: {
        sectionId: parsed.data.sectionId,
        title: parsed.data.title,
        content: parsed.data.content,
        sortOrder: (lastStep?.sortOrder ?? -1) + 1,
      },
    });
    await createAuditLog({
      action: "platform.wiki_step_added",
      targetType: "wiki_section",
      targetId: parsed.data.sectionId,
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin/wiki");
    return { success: "Paso agregado." };
  } catch {
    return { error: "No pudimos agregar el paso." };
  }
}

export async function addWikiDiscussionAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireAdminPermission(adminPermissions.WIKI);
    const parsed = addWikiDiscussionSchema.safeParse({
      sectionId: formData.get("sectionId"),
      content: sanitizeText(String(formData.get("content") ?? "")),
    });
    if (!parsed.success) return { error: "Discusion invalida." };

    await prisma.wikiDiscussion.create({
      data: {
        sectionId: parsed.data.sectionId,
        content: parsed.data.content,
        authorName: adminSession.user.name ?? adminSession.user.email ?? "Admin",
      },
    });
    await createAuditLog({
      action: "platform.wiki_discussion_added",
      targetType: "wiki_section",
      targetId: parsed.data.sectionId,
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin/wiki");
    return { success: "Discusion agregada." };
  } catch {
    return { error: "No pudimos agregar la discusion." };
  }
}

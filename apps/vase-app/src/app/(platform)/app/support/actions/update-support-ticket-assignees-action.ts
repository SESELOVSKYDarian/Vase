"use server";

// Parte de actions.ts: updateSupportTicketAssigneesAction.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { updateSupportTicketAssigneesSchema } from "@/lib/validators/support";
import { createAuditLog } from "@/server/services/audit-log";
import { SupportActionState } from "./support-action-state";

export async function updateSupportTicketAssigneesAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const assigneeIds = Array.from(
      new Set(
        formData
          .getAll("assigneeIds")
          .map((value) => sanitizeNullableText(String(value ?? "")))
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const primaryAssigneeId =
      sanitizeNullableText(String(formData.get("primaryAssigneeId") ?? "")) ?? undefined;

    const parsed = updateSupportTicketAssigneesSchema.safeParse({
      ticketId: formData.get("ticketId"),
      assigneeIds,
      primaryAssigneeId,
    });
    if (!parsed.success) return { error: "No pudimos validar los responsables seleccionados." };

    if (
      parsed.data.primaryAssigneeId &&
      !parsed.data.assigneeIds.includes(parsed.data.primaryAssigneeId)
    ) {
      return { error: "El responsable principal debe estar dentro de los asignados." };
    }

    const validAgents = await prisma.user.findMany({
      where: {
        id: { in: parsed.data.assigneeIds },
        platformRole: { in: ["SUPPORT", "SUPER_ADMIN"] },
      },
      select: { id: true },
    });
    const validAgentIds = new Set(validAgents.map((user) => user.id));
    const normalizedAssigneeIds = parsed.data.assigneeIds.filter((id) => validAgentIds.has(id));

    if (normalizedAssigneeIds.length !== parsed.data.assigneeIds.length) {
      return { error: "Uno o mas responsables no tienen permisos para soporte." };
    }

    const fallbackPrimary = normalizedAssigneeIds[0] ?? null;
    const primaryId =
      (parsed.data.primaryAssigneeId && normalizedAssigneeIds.includes(parsed.data.primaryAssigneeId)
        ? parsed.data.primaryAssigneeId
        : fallbackPrimary) ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.supportTicketAssignee.deleteMany({
        where: { ticketId: parsed.data.ticketId },
      });

      if (normalizedAssigneeIds.length > 0) {
        await tx.supportTicketAssignee.createMany({
          data: normalizedAssigneeIds.map((userId) => ({
            ticketId: parsed.data.ticketId,
            userId,
            isPrimary: primaryId === userId,
          })),
        });
      }

      await tx.supportTicket.update({
        where: { id: parsed.data.ticketId },
        data: {
          assignedToUserId: primaryId,
          assignmentMode: "MANUAL",
        },
      });
    });

    await createAuditLog({
      action: "support.ticket_assignees_updated",
      targetType: "support_ticket",
      targetId: parsed.data.ticketId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        assigneeIds: normalizedAssigneeIds,
        primaryAssigneeId: primaryId,
      },
    });

    revalidatePath("/app/admin/tickets");
    revalidatePath("/app/support");
    return { success: "Responsables actualizados." };
  } catch {
    return { error: "No pudimos guardar los responsables." };
  }
}

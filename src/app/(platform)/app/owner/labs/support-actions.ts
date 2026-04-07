"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createClientSupportTicketSchema } from "@/lib/validators/support";
import { createAuditLog } from "@/server/services/audit-log";
import { createSupportTicketFromEscalation } from "@/server/services/support";

export type ClientSupportActionState = {
  success?: string;
  error?: string;
};

export async function createClientSupportTicketAction(
  _: ClientSupportActionState,
  formData: FormData,
): Promise<ClientSupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    const { membership } = await requireTenantRole(tenantRoles.OWNER);

    const parsed = createClientSupportTicketSchema.safeParse({
      subject: sanitizeText(String(formData.get("subject") ?? "")),
      summary: sanitizeText(String(formData.get("summary") ?? "")),
      priority: formData.get("priority"),
      conversationId:
        sanitizeNullableText(String(formData.get("conversationId") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return { error: "Revisa asunto, prioridad y contexto antes de enviar el ticket." };
    }

    const workspace = await prisma.tenantAiWorkspace.findUnique({
      where: { tenantId: membership.tenantId },
      select: { id: true },
    });

    const ticket = await createSupportTicketFromEscalation({
      tenantId: membership.tenantId,
      createdByUserId: session.user.id,
      conversationId: parsed.data.conversationId,
      workspaceId: workspace?.id,
      subject: parsed.data.subject,
      customerName: membership.tenant.name,
      customerContact: membership.tenant.billingEmail,
      aiSummary: parsed.data.summary,
      priority: parsed.data.priority,
    });

    await createAuditLog({
      action: parsed.data.conversationId
        ? "support.ticket_escalated_from_labs"
        : "support.ticket_created_by_client",
      targetType: "support_ticket",
      targetId: ticket.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        conversationId: parsed.data.conversationId ?? null,
      },
    });

    revalidatePath("/app/owner/labs");
    revalidatePath("/app/support");
    revalidatePath("/app/admin");
    return { success: "Ticket enviado al equipo humano de Vase." };
  } catch {
    return { error: "No pudimos crear el ticket en este momento." };
  }
}

import { createEscalatedSupportTicket } from "@/server/queries/chatbot";
import type { TenantChatbotConfig } from "@/server/services/chatbot/tenant-chatbot-config";

export function shouldEscalateToHuman(text: string, config: TenantChatbotConfig) {
  if (!config.escalation.enabled) {
    return false;
  }

  const normalized = text.toLowerCase();
  return ["humano", "asesor", "persona", "soporte", "ayuda urgente"].some((keyword) =>
    normalized.includes(keyword),
  );
}

export async function escalateConversation(input: {
  tenantId: string;
  workspaceId?: string | null;
  conversationId: string;
  customerName?: string | null;
  customerContact?: string | null;
  text: string;
}) {
  const ticket = await createEscalatedSupportTicket({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    subject: "Escalación automática desde chatbot",
    customerName: input.customerName,
    customerContact: input.customerContact,
    aiSummary: input.text,
  });

  return {
    ticketId: ticket.id,
    reply:
      "He derivado tu consulta a una persona del equipo para que pueda continuarla con mejor contexto.",
  };
}

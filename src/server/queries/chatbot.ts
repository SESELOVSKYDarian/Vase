import { AiChannelType, AiConversationStatus, SupportAssignmentMode, SupportTicketSource, SupportTicketStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function getConnectedChannelByTenant(
  tenantId: string,
  channelType: AiChannelType,
  accountLabel?: string | null,
) {
  return prisma.aiChannelConnection.findFirst({
    where: {
      tenantId,
      channelType,
      status: "CONNECTED",
      ...(accountLabel ? { accountLabel } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function findConversationByExternalThreadKey(
  tenantId: string,
  channelType: AiChannelType,
  externalThreadKey: string,
) {
  return prisma.aiConversation.findFirst({
    where: {
      tenantId,
      channelType,
      externalThreadKey,
    },
  });
}

export async function createConversation(input: {
  tenantId: string;
  workspaceId: string;
  channelType: AiChannelType;
  customerName?: string | null;
  customerContact?: string | null;
  externalThreadKey?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date();

  return prisma.aiConversation.create({
    data: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      channelType: input.channelType,
      customerName: input.customerName,
      customerContact: input.customerContact,
      externalThreadKey: input.externalThreadKey,
      metadata: input.metadata,
      messageCount: 0,
      startedAt: now,
      lastMessageAt: now,
    },
  });
}

export async function updateConversationState(input: {
  conversationId: string;
  metadata?: Record<string, unknown>;
  summary?: string | null;
  incrementMessageCount?: boolean;
  inbound?: boolean;
  outbound?: boolean;
  escalatedToHuman?: boolean;
}) {
  const now = new Date();

  return prisma.aiConversation.update({
    where: { id: input.conversationId },
    data: {
      metadata: input.metadata,
      summary: input.summary ?? undefined,
      escalatedToHuman: input.escalatedToHuman ?? undefined,
      escalationRequestedAt: input.escalatedToHuman ? now : undefined,
      messageCount: input.incrementMessageCount ? { increment: 1 } : undefined,
      lastMessageAt: now,
      lastInboundAt: input.inbound ? now : undefined,
      lastOutboundAt: input.outbound ? now : undefined,
    },
  });
}

export async function closeConversation(conversationId: string, summary?: string | null) {
  const now = new Date();

  return prisma.aiConversation.update({
    where: { id: conversationId },
    data: {
      status: AiConversationStatus.CLOSED,
      closedAt: now,
      lastMessageAt: now,
      summary: summary ?? undefined,
    },
  });
}

export async function createEscalatedSupportTicket(input: {
  tenantId: string;
  workspaceId?: string | null;
  conversationId: string;
  subject: string;
  customerName?: string | null;
  customerContact?: string | null;
  aiSummary?: string | null;
}) {
  return prisma.supportTicket.create({
    data: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      subject: input.subject,
      customerName: input.customerName,
      customerContact: input.customerContact,
      aiSummary: input.aiSummary,
      source: SupportTicketSource.AI_ESCALATION,
      assignmentMode: SupportAssignmentMode.AUTOMATIC,
      status: SupportTicketStatus.QUEUED,
    },
  });
}

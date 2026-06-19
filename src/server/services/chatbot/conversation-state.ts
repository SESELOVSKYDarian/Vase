import type { AiChannelType } from "@prisma/client";
import {
  createConversation,
  findConversationByExternalThreadKey,
  updateConversationState,
} from "@/server/queries/chatbot";

type ConversationMetadata = {
  state: string;
  context: Record<string, unknown>;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
  processedInboundIds: string[];
};

export async function getOrCreateConversation(input: {
  tenantId: string;
  workspaceId: string;
  channelType: AiChannelType;
  externalThreadKey: string;
  customerName?: string | null;
  customerContact?: string | null;
}) {
  const existing = await findConversationByExternalThreadKey(
    input.tenantId,
    input.channelType,
    input.externalThreadKey,
  );

  if (existing) {
    return existing;
  }

  return createConversation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    channelType: input.channelType,
    externalThreadKey: input.externalThreadKey,
    customerName: input.customerName,
    customerContact: input.customerContact,
    metadata: {
      state: "IDLE",
      context: {},
      transcript: [],
      processedInboundIds: [],
    },
  });
}

export function readConversationMetadata(metadata: unknown): ConversationMetadata {
  if (!metadata || typeof metadata !== "object") {
    return { state: "IDLE", context: {}, transcript: [], processedInboundIds: [] };
  }

  const source = metadata as Record<string, unknown>;
  return {
    state: typeof source.state === "string" ? source.state : "IDLE",
    context: source.context && typeof source.context === "object" ? (source.context as Record<string, unknown>) : {},
    transcript: Array.isArray(source.transcript)
      ? (source.transcript as Array<{ role: "user" | "assistant"; content: string }>)
      : [],
    processedInboundIds: Array.isArray(source.processedInboundIds)
      ? source.processedInboundIds.filter((value): value is string => typeof value === "string").slice(-50)
      : [],
  };
}

export function hasProcessedInboundMessage(metadata: unknown, externalMessageId?: string | null) {
  if (!externalMessageId) {
    return false;
  }

  return readConversationMetadata(metadata).processedInboundIds.includes(externalMessageId);
}

export function isAiPaused(metadata: unknown) {
  const current = readConversationMetadata(metadata);
  return Boolean(current.context?.aiPaused);
}

export async function persistInboundMessage(input: {
  conversationId: string;
  metadata: unknown;
  userMessage: string;
  externalMessageId?: string | null;
}) {
  const current = readConversationMetadata(input.metadata);
  const transcript = [...current.transcript, { role: "user" as const, content: input.userMessage }].slice(-20);
  const processedInboundIds = input.externalMessageId
    ? [...new Set([...current.processedInboundIds, input.externalMessageId])].slice(-50)
    : current.processedInboundIds;

  return updateConversationState({
    conversationId: input.conversationId,
    metadata: {
      ...current,
      transcript,
      processedInboundIds,
    },
    incrementMessageCount: true,
    inbound: true,
  });
}

export async function persistOutboundMessage(input: {
  conversationId: string;
  metadata: unknown;
  assistantMessage: string;
  state?: string;
  context?: Record<string, unknown>;
  summary?: string | null;
  escalatedToHuman?: boolean;
}) {
  const current = readConversationMetadata(input.metadata);
  const transcript = [...current.transcript, { role: "assistant" as const, content: input.assistantMessage }].slice(-20);

  return updateConversationState({
    conversationId: input.conversationId,
    summary: input.summary ?? undefined,
    escalatedToHuman: input.escalatedToHuman,
    metadata: {
      state: input.state ?? current.state ?? "IDLE",
      context: input.context ?? current.context ?? {},
      transcript,
      processedInboundIds: current.processedInboundIds,
    },
    incrementMessageCount: true,
    outbound: true,
  });
}

export async function persistHumanMessage(input: {
  conversationId: string;
  metadata: unknown;
  humanMessage: string;
}) {
  const current = readConversationMetadata(input.metadata);
  const transcript = [...current.transcript, { role: "assistant" as const, content: `[HUMANO] ${input.humanMessage}` }].slice(-20);

  return updateConversationState({
    conversationId: input.conversationId,
    metadata: {
      ...current,
      transcript,
    },
    incrementMessageCount: true,
    outbound: true,
  });
}

export async function persistHumanMessageAndPause(input: {
  conversationId: string;
  metadata: unknown;
  humanMessage: string;
}) {
  const current = readConversationMetadata(input.metadata);
  const transcript = [...current.transcript, { role: "assistant" as const, content: `[HUMANO] ${input.humanMessage}` }].slice(-20);

  return updateConversationState({
    conversationId: input.conversationId,
    metadata: {
      ...current,
      context: {
        ...current.context,
        aiPaused: true,
      },
      transcript,
    },
    incrementMessageCount: true,
    outbound: true,
  });
}

export async function setConversationAiPaused(input: {
  conversationId: string;
  metadata: unknown;
  paused: boolean;
}) {
  const current = readConversationMetadata(input.metadata);

  return updateConversationState({
    conversationId: input.conversationId,
    metadata: {
      ...current,
      context: {
        ...current.context,
        aiPaused: input.paused,
      },
    },
  });
}

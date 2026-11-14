// Parte de channel-ai-runner.ts: RunnerInput, ReplyGenerator, ChannelAiReplyRunnerDeps, PrismaTransactionLike, metadataAfterSuccessfulAiReply, persistPrismaAssistantReply y más.
import { randomUUID } from "node:crypto";
import { type LabsChannel } from "@vase/contracts";
import { createAiOrchestrator, type OrchestratedAiReply } from "../ai-orchestrator";
import { type RunChannelAiReply } from "../channel-webhook-service";
import { resolveApprovedOpenAiModel } from "../openai-reply-generator";

export type RunnerInput = Parameters<RunChannelAiReply>[0];

export type ReplyGenerator = {
  generateReply(input: {
    userText: string;
    context: string;
    systemPrompt?: string | null;
    allowedImageUrls?: string[];
  }): Promise<OrchestratedAiReply>;
};

export type ChannelAiReplyRunnerDeps = {
  env?: NodeJS.ProcessEnv;
  resolveOpenAiApiKey?(assistantId: string): Promise<string | null>;
  knowledge: { buildContext(assistantId: string): Promise<string> };
  businessProfile?: { buildContext(globalTenantId: string): Promise<string> };
  catalog?: {
    buildAiResources?(globalTenantId: string, query?: string): Promise<{
      context: string;
      allowedImageUrls: string[];
    }>;
    buildAiContext?(globalTenantId: string): Promise<string>;
  };
  createReplyGenerator(input: { apiKey?: string; model: string }): ReplyGenerator;
  requestHandoff?(input: { conversationId: string; reason: string }): Promise<void>;
  orders?: NonNullable<Parameters<typeof createAiOrchestrator>[0]["orders"]>;
  listSentImageUrls?(conversationId: string): Promise<string[]>;
  persistAssistantReply(input: {
    assistantId: string;
    conversationId: string;
    channel: LabsChannel;
    text: string;
    imageUrls: string[];
  }): Promise<{ messageId: string }>;
  registerTokenUsage(input: {
    globalTenantId: string;
    channel: LabsChannel;
    inputTokens: number;
    outputTokens: number;
    messageId: string;
    conversationId: string;
    assistantId: string;
    source?: string;
    model?: string | null;
    profile?: string | null;
  }): Promise<{ totalTokens: number }>;
  sendReply(input: {
    globalTenantId: string;
    channelId?: string;
    channel: LabsChannel;
    conversationId: string;
    recipientId: string;
    text: string;
    imageUrls?: string[];
  }): Promise<{ ok: boolean; providerMessageId?: string | null }>;
  markAssistantReplyDelivery?(input: {
    messageId: string;
    status: "SENT" | "FAILED";
    providerMessageId?: string | null;
    error?: string | null;
  }): Promise<void>;
};

export type PrismaTransactionLike = {
  $queryRaw<T>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  message: { create(input: unknown): Promise<{ id: string }> };
  conversation: {
    findUnique(input: unknown): Promise<{ metadata: unknown } | null>;
    update(input: unknown): Promise<unknown>;
  };
};

export function metadataAfterSuccessfulAiReply(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = { ...(value as Record<string, unknown>) };
  const rawContext = metadata.context;
  const context = rawContext && typeof rawContext === "object" && !Array.isArray(rawContext)
    ? { ...(rawContext as Record<string, unknown>) }
    : {};
  const hasFailure = metadata.state === "AI_FAILED"
    || "aiReplyError" in context
    || "aiReplyFailedAt" in context
    || "aiReplyFailedMessageId" in context;
  if (!hasFailure) return null;

  delete context.aiReplyError;
  delete context.aiReplyFailedAt;
  delete context.aiReplyFailedMessageId;
  if (metadata.state === "AI_FAILED") metadata.state = "IDLE";
  metadata.context = context;
  return metadata;
}

export async function persistPrismaAssistantReply(
  prisma: { $transaction<T>(callback: (client: PrismaTransactionLike) => Promise<T>): Promise<T> },
  reply: {
    assistantId: string;
    conversationId: string;
    channel: LabsChannel;
    text: string;
    imageUrls?: string[];
  },
): Promise<{ messageId: string }> {
  return prisma.$transaction(async (transaction) => {
    const now = new Date();
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Conversation
      WHERE id = ${reply.conversationId}
        AND assistantId = ${reply.assistantId}
      FOR UPDATE
    `;
    if (locked.length === 0) throw new Error("ASSISTANT_CONVERSATION_NOT_FOUND");
    const conversation = await transaction.conversation.findUnique({
      where: { id: reply.conversationId },
      select: { metadata: true },
    });
    const nextMetadata = metadataAfterSuccessfulAiReply(conversation?.metadata);
    const message = await transaction.message.create({
      data: {
        id: randomUUID(),
        conversationId: reply.conversationId,
        role: "assistant",
        direction: "OUTBOUND",
        content: reply.text,
        metadata: { imageUrls: reply.imageUrls ?? [] },
        deliveries: { create: { channel: reply.channel, status: "PENDING" } },
      },
      select: { id: true },
    });
    await transaction.conversation.update({
      where: { id: reply.conversationId },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: now,
        lastOutboundAt: now,
        ...(nextMetadata ? { metadata: nextMetadata } : {}),
      },
    });
    return { messageId: message.id };
  });
}

export async function markPrismaAssistantReplyDelivery(
  prisma: { messageDelivery: { updateMany(input: unknown): Promise<unknown> } },
  input: {
    messageId: string;
    status: "SENT" | "FAILED";
    providerMessageId?: string | null;
    error?: string | null;
  },
): Promise<void> {
  const completedAt = new Date();
  await prisma.messageDelivery.updateMany({
    where: { messageId: input.messageId, status: "PENDING" },
    data: {
      status: input.status,
      providerMessageId: input.providerMessageId ?? null,
      error: input.error ?? null,
      sentAt: input.status === "SENT" ? completedAt : null,
      failedAt: input.status === "FAILED" ? completedAt : null,
    },
  });
}

export function createChannelAiReplyRunner(deps: ChannelAiReplyRunnerDeps): RunChannelAiReply {
  return async function runAiReply(input: RunnerInput) {
    const latestUserText = input.message.text?.trim();
    const recipientId = input.message.customerContact ?? input.message.externalThreadKey;
    if (!latestUserText || !recipientId) {
      return { ok: false };
    }

    const model = resolveApprovedOpenAiModel(input.context.assistantModel, deps.env);
    const assistantApiKey = await deps.resolveOpenAiApiKey?.(input.context.assistantId);
    const generator = deps.createReplyGenerator({
      apiKey: assistantApiKey ?? deps.env?.OPENAI_API_KEY,
      model,
    });
    const orchestrator = createAiOrchestrator({
      knowledge: deps.knowledge,
      businessProfile: deps.businessProfile,
      catalog: deps.catalog,
      generateReply: generator.generateReply,
      orders: deps.orders,
      listSentImageUrls: deps.listSentImageUrls,
      persistAssistantReply: deps.persistAssistantReply,
      registerTokenUsage: deps.registerTokenUsage,
      sendReply(reply) {
        return deps.sendReply({
          globalTenantId: input.context.globalTenantId,
          channelId: input.context.channel?.id,
          channel: reply.channel,
          conversationId: reply.conversationId,
          recipientId,
          text: reply.text,
          imageUrls: reply.imageUrls,
        });
      },
      markAssistantReplyDelivery: deps.markAssistantReplyDelivery,
      requestHandoff: deps.requestHandoff,
    });

    return orchestrator.processConversation({
      assistantId: input.context.assistantId,
      conversationId: input.persisted.conversationId,
      globalTenantId: input.context.globalTenantId,
      channel: input.context.channelType,
      latestUserText,
      systemPrompt: input.context.assistantSystemPrompt,
      canRunAi: true,
      handoffActive: Boolean(input.persisted.handoffActive),
    });
  };
}

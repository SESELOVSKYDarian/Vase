import { randomUUID } from "node:crypto";
import type { LabsChannel } from "@vase/contracts";
import { createAiOrchestrator } from "./ai-orchestrator";
import type {
  ChannelWebhookContext,
  PersistChannelInboundMessageResult,
  RunChannelAiReply,
} from "./channel-webhook-service";
import { createOfficialChannelSender } from "./official-channel-sender";
import { PrismaOfficialChannelSenderRepository } from "./official-channel-sender-repository";
import { labsCatalogService } from "./catalog-repository";
import { labsEntitlementsService } from "./labs-entitlements-service";
import { createKnowledgeService } from "./knowledge-service";
import { createOpenAiReplyGenerator, getDefaultOpenAiModel, type AiReplyResult } from "./openai-reply-generator";
import { labsPrisma, type PrismaClient } from "./db";
import { decryptChannelSecret } from "./channel-secrets";

type RunnerInput = Parameters<RunChannelAiReply>[0];

type ReplyGenerator = {
  generateReply(input: { userText: string; context: string }): Promise<AiReplyResult>;
};

type ChannelAiReplyRunnerDeps = {
  env?: NodeJS.ProcessEnv;
  resolveOpenAiApiKey?(assistantId: string): Promise<string | null>;
  knowledge: { buildContext(assistantId: string): Promise<string> };
  catalog?: { buildAiContext(globalTenantId: string): Promise<string> };
  createReplyGenerator(input: { apiKey?: string; model: string }): ReplyGenerator;
  persistAssistantReply(input: {
    conversationId: string;
    channel: LabsChannel;
    text: string;
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
  }): Promise<{ totalTokens: number }>;
  sendReply(input: {
    globalTenantId: string;
    channel: LabsChannel;
    conversationId: string;
    recipientId: string;
    text: string;
  }): Promise<{ ok: boolean; providerMessageId?: string | null }>;
  markAssistantReplyDelivery?(input: {
    messageId: string;
    status: "SENT" | "FAILED";
    providerMessageId?: string | null;
    error?: string | null;
  }): Promise<void>;
};

type PrismaTransactionLike = {
  message: { create(input: unknown): Promise<{ id: string }> };
  conversation: { update(input: unknown): Promise<unknown> };
};

export async function persistPrismaAssistantReply(
  prisma: { $transaction<T>(callback: (client: PrismaTransactionLike) => Promise<T>): Promise<T> },
  reply: { conversationId: string; channel: LabsChannel; text: string },
): Promise<{ messageId: string }> {
  return prisma.$transaction(async (transaction) => {
    const now = new Date();
    const message = await transaction.message.create({
      data: {
        id: randomUUID(),
        conversationId: reply.conversationId,
        role: "assistant",
        direction: "OUTBOUND",
        content: reply.text,
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

    const model = input.context.assistantModel ?? getDefaultOpenAiModel(deps.env);
    const assistantApiKey = await deps.resolveOpenAiApiKey?.(input.context.assistantId);
    const generator = deps.createReplyGenerator({
      apiKey: assistantApiKey ?? deps.env?.OPENAI_API_KEY,
      model,
    });
    const orchestrator = createAiOrchestrator({
      knowledge: deps.knowledge as any,
      catalog: deps.catalog,
      generateReply: generator.generateReply,
      persistAssistantReply: deps.persistAssistantReply,
      registerTokenUsage: deps.registerTokenUsage,
      sendReply(reply) {
        return deps.sendReply({
          globalTenantId: input.context.globalTenantId,
          channel: reply.channel,
          conversationId: reply.conversationId,
          recipientId,
          text: reply.text,
        });
      },
      markAssistantReplyDelivery: deps.markAssistantReplyDelivery,
    });

    return orchestrator.processConversation({
      assistantId: input.context.assistantId,
      conversationId: input.persisted.conversationId,
      globalTenantId: input.context.globalTenantId,
      channel: input.context.channelType,
      latestUserText,
      canRunAi: true,
      handoffActive: false,
    });
  };
}

export function createPrismaChannelAiReplyRunner(input: {
  prisma?: PrismaClient;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
} = {}): RunChannelAiReply {
  const prisma = input.prisma ?? labsPrisma;
  const env = input.env ?? process.env;
  const sender = createOfficialChannelSender({
    repository: new PrismaOfficialChannelSenderRepository(prisma),
    encryptionSecret: env.TOKEN_ENCRYPTION_SECRET ?? "",
    graphVersion: env.META_GRAPH_VERSION?.trim() || "v25.0",
    fetcher: input.fetcher,
  });

  return createChannelAiReplyRunner({
    env,
    knowledge: createKnowledgeService({
      listReadyKnowledge(assistantId) {
        return (prisma as any).knowledgeItem.findMany({
          where: { assistantId, status: "READY" },
          orderBy: { updatedAt: "desc" },
          take: 24,
        });
      },
    }),
    catalog: labsCatalogService,
    async resolveOpenAiApiKey(assistantId) {
      const secret = await (prisma as any).assistantSecret.findUnique({
        where: { assistantId_kind: { assistantId, kind: "OPENAI_API_KEY" } },
        select: { encryptedValue: true },
      });
      if (!secret?.encryptedValue) return null;

      const encryptionSecret = env.TOKEN_ENCRYPTION_SECRET?.trim();
      if (!encryptionSecret) {
        throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
      }

      return decryptChannelSecret(secret.encryptedValue, encryptionSecret);
    },
    createReplyGenerator({ apiKey, model }) {
      return createOpenAiReplyGenerator({
        apiKey,
        model,
        env,
        fetcher: input.fetcher,
      });
    },
    async persistAssistantReply(reply) {
      return persistPrismaAssistantReply(prisma as any, reply);
    },
    async registerTokenUsage(usage) {
      const result = await labsEntitlementsService.registerTokenUsage(usage.globalTenantId, usage);
      return { totalTokens: result.usage.totalTokens };
    },
    markAssistantReplyDelivery(delivery) {
      return markPrismaAssistantReplyDelivery(prisma as any, delivery);
    },
    sendReply(reply) {
      return sender.send({
        globalTenantId: reply.globalTenantId,
        channelType: reply.channel,
        recipientId: reply.recipientId,
        text: reply.text,
      });
    },
  });
}

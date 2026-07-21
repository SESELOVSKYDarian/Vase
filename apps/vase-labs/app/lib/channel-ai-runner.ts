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
};

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
    graphVersion: env.META_GRAPH_VERSION?.trim() || "v24.0",
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
      const messageId = randomUUID();
      await (prisma as any).message.create({
        data: {
          id: messageId,
          conversationId: reply.conversationId,
          role: "assistant",
          direction: "OUTBOUND",
          content: reply.text,
        },
      });
      return { messageId };
    },
    async registerTokenUsage(usage) {
      const result = await labsEntitlementsService.registerTokenUsage(usage.globalTenantId, usage);
      return { totalTokens: result.usage.totalTokens };
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

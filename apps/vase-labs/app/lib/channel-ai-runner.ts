import { randomUUID } from "node:crypto";
import type { LabsChannel } from "@vase/contracts";
import { createAiOrchestrator, type OrchestratedAiReply } from "./ai-orchestrator";
import type { RunChannelAiReply } from "./channel-webhook-service";
import { createOfficialChannelSender } from "./official-channel-sender";
import { PrismaOfficialChannelSenderRepository } from "./official-channel-sender-repository";
import { labsCatalogService } from "./catalog-repository";
import { labsEntitlementsService } from "./labs-entitlements-service";
import { createKnowledgeService } from "./knowledge-service";
import { createOpenAiReplyGenerator, resolveApprovedOpenAiModel } from "./openai-reply-generator";
import { labsPrisma, type PrismaClient } from "./db";
import { decryptChannelSecret } from "./channel-secrets";
import { createBusinessOrderClient } from "./business-order-client";
import { createConversationOrderOrchestrator } from "./conversation-order-orchestrator";
import {
  confirmConversationOrderDraft,
  prepareConversationOrderDraft,
  prismaConversationOrderDraftRepository,
} from "./conversation-order-tools";
import { upsertBusinessOrderProjection } from "./order-projection";
import { enrichLocalOrderSnapshot } from "./local-order-snapshot";

type RunnerInput = Parameters<RunChannelAiReply>[0];

type ReplyGenerator = {
  generateReply(input: {
    userText: string;
    context: string;
    systemPrompt?: string | null;
    allowedImageUrls?: string[];
  }): Promise<OrchestratedAiReply>;
};

type ChannelAiReplyRunnerDeps = {
  env?: NodeJS.ProcessEnv;
  resolveOpenAiApiKey?(assistantId: string): Promise<string | null>;
  knowledge: { buildContext(assistantId: string): Promise<string> };
  catalog?: {
    buildAiResources?(globalTenantId: string): Promise<{
      context: string;
      allowedImageUrls: string[];
    }>;
    buildAiContext?(globalTenantId: string): Promise<string>;
  };
  createReplyGenerator(input: { apiKey?: string; model: string }): ReplyGenerator;
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

type PrismaTransactionLike = {
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

function metadataAfterSuccessfulAiReply(value: unknown): Record<string, unknown> | null {
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
  const businessOrders = createBusinessOrderClient({
    appInternalUrl: env.APP_INTERNAL_URL,
    serviceToken: env.SERVICE_TO_SERVICE_TOKEN,
    fetcher: input.fetcher,
  });
  const orders = createConversationOrderOrchestrator({
    async loadHistory(conversationId) {
      const [conversation, messages] = await Promise.all([
        prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { customerName: true, customerContact: true },
        }),
        prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { role: true, content: true },
        }),
      ]);
      const customerContext = [
        conversation?.customerName ? `nombre ${conversation.customerName}` : null,
        conversation?.customerContact ? `telefono ${conversation.customerContact}` : null,
      ].filter(Boolean).join("; ");
      return [
        ...(customerContext ? [{ role: "system", content: `Datos verificados del cliente: ${customerContext}` }] : []),
        ...messages.reverse(),
      ];
    },
    loadFulfillment(globalTenantId) {
      return businessOrders.getFulfillment(globalTenantId);
    },
    findActiveDraft(conversationId) {
      return prismaConversationOrderDraftRepository.findActiveDraft(conversationId);
    },
    async createLocalOrder(orderInput) {
      const requestedItems = Array.isArray(orderInput.order.items)
        ? orderInput.order.items as Array<{ productId: string }>
        : [];
      const catalogProducts = await prisma.catalogProduct.findMany({
        where: {
          globalTenantId: orderInput.globalTenantId,
          externalProductId: { in: requestedItems.map((item) => item.productId) },
          active: true,
        },
        select: { externalProductId: true, sku: true, name: true, price: true, imageUrl: true },
      });
      const enrichedOrder = enrichLocalOrderSnapshot(
        orderInput.order as Record<string, unknown> & {
          items: Array<{ productId: string; name?: string; quantity: number }>;
        },
        catalogProducts,
      );
      await upsertBusinessOrderProjection({
        globalTenantId: orderInput.globalTenantId,
        assistantId: orderInput.assistantId,
        conversationId: orderInput.conversationId,
        order: enrichedOrder,
      });
      return enrichedOrder;
    },
    prepareDraft(orderInput) {
      return prepareConversationOrderDraft(orderInput, {
        business: businessOrders,
        repository: prismaConversationOrderDraftRepository,
      });
    },
    confirmDraft(orderInput) {
      return confirmConversationOrderDraft(orderInput, {
        business: businessOrders,
        repository: prismaConversationOrderDraftRepository,
        projectOrder: upsertBusinessOrderProjection,
      });
    },
  });

  return createChannelAiReplyRunner({
    env,
    knowledge: createKnowledgeService({
      async listReadyKnowledge(assistantId) {
        const items = await prisma.knowledgeItem.findMany({
          where: { assistantId, status: "READY" },
          orderBy: { updatedAt: "desc" },
          take: 24,
        });
        const corrections = await prisma.knowledgeCorrection.findMany({
          where: { knowledgeItemId: { in: items.map((item) => item.id) }, active: true },
          orderBy: { updatedAt: "desc" },
        });
        const correctionByKnowledgeId = new Map<string, string>();
        for (const correction of corrections) {
          if (!correctionByKnowledgeId.has(correction.knowledgeItemId)) {
            correctionByKnowledgeId.set(correction.knowledgeItemId, correction.content);
          }
        }
        return items.map((item) => ({
          ...item,
          content: correctionByKnowledgeId.get(item.id) ?? item.extractedText ?? item.content,
          status: "READY" as const,
        }));
      },
    }),
    catalog: labsCatalogService,
    orders,
    async listSentImageUrls(conversationId) {
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          role: "assistant",
          deliveries: { some: { status: "SENT" } },
        },
        select: { metadata: true },
      });
      return [...new Set(messages.flatMap((message) => {
        const imageUrls = (message.metadata as { imageUrls?: unknown } | null)?.imageUrls;
        return Array.isArray(imageUrls)
          ? imageUrls.filter((url): url is string => typeof url === "string")
          : [];
      }))];
    },
    async resolveOpenAiApiKey(assistantId) {
      const secret = await prisma.assistantSecret.findUnique({
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
      return persistPrismaAssistantReply(prisma, reply);
    },
    async registerTokenUsage(usage) {
      const result = await labsEntitlementsService.registerTokenUsage(usage.globalTenantId, usage);
      return { totalTokens: result.usage.totalTokens };
    },
    markAssistantReplyDelivery(delivery) {
      return markPrismaAssistantReplyDelivery(prisma, delivery);
    },
    sendReply(reply) {
      return sender.send({
        globalTenantId: reply.globalTenantId,
        channelId: reply.channelId,
        channelType: reply.channel,
        recipientId: reply.recipientId,
        text: reply.text,
        imageUrls: reply.imageUrls,
      });
    },
  });
}

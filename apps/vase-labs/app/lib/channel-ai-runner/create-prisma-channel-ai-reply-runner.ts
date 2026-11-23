// Parte de channel-ai-runner.ts: createPrismaChannelAiReplyRunner.
import { randomUUID } from "node:crypto";
import { type RunChannelAiReply } from "../channel-webhook-service";
import { createOfficialChannelSender } from "../official-channel-sender";
import { PrismaOfficialChannelSenderRepository } from "../official-channel-sender-repository";
import { buildBusinessProfileContext } from "../business-profile";
import { labsCatalogService } from "../catalog-repository";
import { labsEntitlementsService } from "../labs-entitlements-service";
import { createKnowledgeService } from "../knowledge-service";
import { createOpenAiReplyGenerator } from "../openai-reply-generator";
import { labsPrisma, type PrismaClient } from "../db";
import { decryptChannelSecret } from "../channel-secrets";
import { createBusinessOrderClient } from "../business-order-client";
import { createConversationOrderOrchestrator } from "../conversation-order-orchestrator";
import { confirmConversationOrderDraft, prepareConversationOrderDraft, prismaConversationOrderDraftRepository } from "../conversation-order-tools";
import { upsertBusinessOrderProjection } from "../order-projection";
import { enrichLocalOrderSnapshot } from "../local-order-snapshot";
import { createConversationQuote } from "../conversation-quote-service";
import { notifyVaseSupportHandoffInBackground } from "../vase-support-bridge";
import { createChannelAiReplyRunner, markPrismaAssistantReplyDelivery, persistPrismaAssistantReply } from "./channel-ai-reply-runner-deps";

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
    businessProfile: { buildContext: buildBusinessProfileContext },
    async requestHandoff({ conversationId, reason }) {
      await prisma.$transaction(async (tx) => {
        const open = await tx.handoff.findFirst({
          where: { conversationId, status: { in: ["PENDING", "ASSIGNED"] } },
          select: { id: true },
        });
        if (!open) {
          await tx.handoff.create({
            data: {
              id: randomUUID(),
              conversationId,
              reason,
              target: "labs",
              status: "PENDING",
              priority: "high",
              notes: JSON.stringify({ source: "ai_assistant" }),
            },
          });
        }
        await tx.conversation.update({
          where: { id: conversationId },
          data: { status: "ESCALATED", escalatedToHuman: true },
        });
      });
      notifyVaseSupportHandoffInBackground(prisma as never, { conversationId, reason });
    },
    orders: {
      ...orders,
      quote(quoteInput) {
        return createConversationQuote(prisma, quoteInput, env);
      },
    },
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
        document: reply.document,
      });
    },
  });
}

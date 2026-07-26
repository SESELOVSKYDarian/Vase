import { describe, expect, it } from "vitest";
import type {
  ChannelWebhookContext,
  ChannelWebhookRepository,
  PersistChannelInboundMessageInput,
  PersistChannelInboundMessageResult,
} from "../apps/vase-labs/app/lib/channel-webhook-service";
import {
  detectHumanHandoffIntent,
  getChannelWebhookVerifyResult,
  handleMetaChannelWebhook,
} from "../apps/vase-labs/app/lib/channel-webhook-service";
import { signMetaPayload } from "../apps/vase-labs/app/lib/meta-signature";
import { parseInstagramWebhookMessage } from "../apps/vase-labs/app/lib/instagram-webhook";
import { parseWhatsAppWebhookMessage } from "../apps/vase-labs/app/lib/whatsapp-webhook";
import { recoverConversationAnalysisEnqueues } from "../apps/vase-labs/app/lib/conversation-analysis-worker";

function createContext(overrides: Partial<ChannelWebhookContext> = {}): ChannelWebhookContext {
  return {
    assistantId: "assistant_123",
    globalTenantId: "tenant_123",
    tenantSlug: "tenant-demo",
    channelType: "INSTAGRAM",
    channel: {
      id: "channel_123",
      provider: "META_OFFICIAL",
      status: "CONNECTED",
      config: {
        provider: "META_OFFICIAL",
        appSecret: "secret",
        verifyToken: "verify-token",
        accessToken: "access-token",
      },
    },
    entitlement: {
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      tokenPack: null,
      tokensIncluded: 250000,
      tokensUsed: 0,
      extraTokens: 0,
      currentPeriodStart: null,
      renewsAt: null,
    },
    ...overrides,
  };
}

function createInstagramPayload() {
  return {
    object: "instagram",
    entry: [{
      id: "ig_business_123",
      messaging: [{
        sender: { id: "ig_user_456" },
        recipient: { id: "ig_business_123" },
        message: {
          mid: "ig_mid_123",
          text: "Hola IG",
        },
      }],
    }],
  };
}

class MemoryChannelWebhookRepository implements ChannelWebhookRepository {
  persisted: PersistChannelInboundMessageInput[] = [];
  aiFailures: Array<{ conversationId: string; messageId: string; reason: string }> = [];
  handoffs: Array<{ conversationId: string; messageId: string; reason: string; source: string }> = [];
  analysisEnqueues: Array<{
    conversationId: string;
    messageId: string;
    messageCreatedAt: Date;
  }> = [];
  analysisEnqueueFailures: Array<{ conversationId: string; messageId: string; reason: string }> = [];
  audioTranscriptionEnqueues: Array<{
    conversationId: string;
    messageId: string;
    providerMediaId: string;
    mimeType: string | null;
  }> = [];
  failAnalysisEnqueue = false;
  operationOrder: string[] = [];
  eventSeen = false;

  constructor(private readonly context: ChannelWebhookContext | null) {}

  async findContextByTenantSlug() {
    return this.context;
  }

  async markWebhookEventProcessing() {
    if (this.eventSeen) return { duplicate: true };
    this.eventSeen = true;
    return { duplicate: false };
  }

  async persistInboundMessage(input: PersistChannelInboundMessageInput): Promise<PersistChannelInboundMessageResult> {
    this.operationOrder.push("persist");
    this.persisted.push(input);
    return {
      conversationId: "conversation_123",
      messageId: "message_123",
      messageCreatedAt: new Date("2026-07-23T12:00:00.000Z"),
      aiBlockedReason: input.aiBlockedReason,
    };
  }

  async enqueueConversationAnalysis(input: {
    conversationId: string;
    messageId: string;
    messageCreatedAt: Date;
  }) {
    this.operationOrder.push("enqueue");
    if (this.failAnalysisEnqueue) throw new Error("database details must stay private");
    this.analysisEnqueues.push(input);
  }

  async enqueueAudioTranscription(input: {
    conversationId: string;
    messageId: string;
    providerMediaId: string;
    mimeType: string | null;
  }) {
    this.operationOrder.push("enqueue_audio");
    this.audioTranscriptionEnqueues.push(input);
  }

  async markConversationAnalysisEnqueueFailed(input: {
    conversationId: string;
    messageId: string;
    reason: string;
  }) {
    this.analysisEnqueueFailures.push(input);
  }

  async markAiReplyFailed(input: { conversationId: string; messageId: string; reason: string }) {
    this.aiFailures.push(input);
  }

  async requestHumanHandoff(input: { conversationId: string; messageId: string; reason: string; source: string }) {
    this.operationOrder.push("handoff");
    this.handoffs.push(input);
  }
}

describe("Vase Labs generic Meta channel webhook service", () => {
  it("detects explicit human handoff requests in inbound text", () => {
    expect(detectHumanHandoffIntent("quiero hablar con un humano")).toBe(true);
    expect(detectHumanHandoffIntent("me atiende un asesor?")).toBe(true);
    expect(detectHumanHandoffIntent("can I talk to a human agent")).toBe(true);
    expect(detectHumanHandoffIntent("hola, tienen stock?")).toBe(false);
  });

  it("verifies Meta hub.challenge with channel config", () => {
    const result = getChannelWebhookVerifyResult({
      context: createContext(),
      url: "https://labs.vase.ar/api/v1/channels/instagram/tenant-demo/webhook?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=abc123",
    });

    expect(result).toEqual({ status: 200, body: "abc123" });
  });

  it("normalizes and persists valid inbound messages for the configured channel", async () => {
    const repository = new MemoryChannelWebhookRepository(createContext());
    const aiRuns: unknown[] = [];
    const body = JSON.stringify(createInstagramPayload());
    const result = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
      runAiReply: async (input) => {
        aiRuns.push(input);
        return { ok: true, messageId: "ai_message_123", totalTokens: 42 };
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      processed: true,
      conversationId: "conversation_123",
      messageId: "message_123",
      aiBlockedReason: null,
    });
    expect(repository.persisted[0]).toMatchObject({
      aiBlockedReason: null,
      message: {
        channelType: "INSTAGRAM",
        externalThreadKey: "ig_user_456",
        text: "Hola IG",
      },
    });
    expect(aiRuns).toHaveLength(1);
    expect(repository.analysisEnqueues).toEqual([{
      conversationId: "conversation_123",
      messageId: "message_123",
      messageCreatedAt: new Date("2026-07-23T12:00:00.000Z"),
    }]);
    expect(aiRuns[0]).toMatchObject({
      context: { assistantId: "assistant_123", globalTenantId: "tenant_123" },
      persisted: { conversationId: "conversation_123", messageId: "message_123" },
      message: { text: "Hola IG" },
    });
  });

  it("runs AI when legacy token balance is exhausted but dollar budget remains", async () => {
    const repository = new MemoryChannelWebhookRepository(createContext({
      entitlement: {
        globalTenantId: "tenant_123",
        plan: "STARTER",
        status: "ACTIVE",
        enabledChannels: ["INSTAGRAM"],
        tokenPack: null,
        tokensIncluded: 50000,
        tokensUsed: 569970,
        extraTokens: 0,
        aiBudgetMicros: 5000000,
        aiBudgetUsedMicros: 4420000,
        extraAiBudgetMicros: 0,
        currentPeriodStart: null,
        renewsAt: null,
      },
    }));
    const aiRuns: unknown[] = [];
    const body = JSON.stringify(createInstagramPayload());

    const result = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
      runAiReply: async (input) => {
        aiRuns.push(input);
        return { ok: true, messageId: "ai_message_123", totalTokens: 42 };
      },
    });

    expect(result.body.aiBlockedReason).toBeNull();
    expect(repository.persisted[0]?.aiBlockedReason).toBeNull();
    expect(aiRuns).toHaveLength(1);
  });

  it("queues inbound audio for transcription before running AI", async () => {
    const repository = new MemoryChannelWebhookRepository(createContext({
      channelType: "WHATSAPP",
    }));
    const aiRuns: unknown[] = [];
    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{
        id: "waba_123",
        changes: [{
          value: {
            contacts: [{ profile: { name: "Cliente" }, wa_id: "5491112345678" }],
            messages: [{
              from: "5491112345678",
              id: "wamid.audio.1",
              type: "audio",
              audio: { id: "media_audio_1", mime_type: "audio/ogg" },
            }],
          },
        }],
      }],
    });

    const result = await handleMetaChannelWebhook({
      channelType: "WHATSAPP",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseWhatsAppWebhookMessage,
      runAiReply: async (input) => {
        aiRuns.push(input);
        return { ok: true };
      },
    });

    expect(result.body).toMatchObject({
      ok: true,
      processed: true,
      aiBlockedReason: null,
    });
    expect(repository.audioTranscriptionEnqueues).toMatchObject([{
      conversationId: "conversation_123",
      messageId: "message_123",
      providerMediaId: "media_audio_1",
      mimeType: "audio/ogg",
    }]);
    expect(repository.analysisEnqueues).toHaveLength(0);
    expect(aiRuns).toHaveLength(0);
    expect(repository.operationOrder).toEqual(["persist", "enqueue_audio"]);
  });

  it("keeps the durable inbound acknowledged when analysis enqueue fails", async () => {
    const repository = new MemoryChannelWebhookRepository(createContext());
    repository.failAnalysisEnqueue = true;
    const body = JSON.stringify(createInstagramPayload());

    const result = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
    });

    expect(result).toMatchObject({
      status: 200,
      body: {
        ok: true,
        processed: true,
        conversationId: "conversation_123",
        messageId: "message_123",
      },
    });
    expect(repository.persisted).toHaveLength(1);
    expect(repository.analysisEnqueueFailures).toMatchObject([{
      conversationId: "conversation_123",
      messageId: "message_123",
      reason: "CONVERSATION_ANALYSIS_ENQUEUE_FAILED",
    }]);

    repository.failAnalysisEnqueue = false;
    const duplicate = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
    });
    expect(duplicate.body).toMatchObject({
      ok: true,
      processed: false,
      reason: "duplicate",
    });
    expect(repository.persisted).toHaveLength(1);

    await recoverConversationAnalysisEnqueues({
      repository: {
        async listFailedEnqueueCandidates() {
          return [{
            conversationId: "conversation_123",
            assistantId: "assistant_123",
            messageId: "message_123",
            messageCreatedAt: new Date("2026-07-23T12:00:00.000Z"),
          }];
        },
        async clearFailedEnqueueMarker() {
          repository.analysisEnqueueFailures = [];
        },
      },
      enqueue: (request) => repository.enqueueConversationAnalysis({
        conversationId: request.conversationId,
        messageId: request.requestedThroughMessageId,
        messageCreatedAt: request.requestedThroughMessageCreatedAt,
      }),
      limit: 10,
    });
    expect(repository.analysisEnqueues).toHaveLength(1);
    expect(repository.analysisEnqueueFailures).toHaveLength(0);
  });

  it("persists inbound messages and marks AI blocked when the channel is not entitled", async () => {
    const repository = new MemoryChannelWebhookRepository(createContext({
      entitlement: {
        globalTenantId: "tenant_123",
        plan: "STARTER",
        status: "ACTIVE",
        enabledChannels: ["WHATSAPP"],
        tokenPack: null,
        tokensIncluded: 50000,
        tokensUsed: 0,
        extraTokens: 0,
        currentPeriodStart: null,
        renewsAt: null,
      },
    }));
    const body = JSON.stringify(createInstagramPayload());
    const result = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
    });

    expect(result.status).toBe(200);
    expect(result.body.aiBlockedReason).toBe("CHANNEL_NOT_ENTITLED");
    expect(repository.persisted[0]?.aiBlockedReason).toBe("CHANNEL_NOT_ENTITLED");
  });

  it("does not run AI when the channel entitlement blocks the assistant", async () => {
    const repository = new MemoryChannelWebhookRepository(createContext({
      entitlement: {
        globalTenantId: "tenant_123",
        plan: "STARTER",
        status: "ACTIVE",
        enabledChannels: ["WHATSAPP"],
        tokenPack: null,
        tokensIncluded: 50000,
        tokensUsed: 0,
        extraTokens: 0,
        currentPeriodStart: null,
        renewsAt: null,
      },
    }));
    let ranAi = false;
    const body = JSON.stringify(createInstagramPayload());
    await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
      runAiReply: async () => {
        ranAi = true;
        return { ok: true, messageId: "ai_message_123", totalTokens: 42 };
      },
    });

    expect(ranAi).toBe(false);
  });

  it("pauses AI and creates a handoff when the customer asks for a human", async () => {
    const repository = new MemoryChannelWebhookRepository(createContext());
    let ranAi = false;
    const body = JSON.stringify({
      object: "instagram",
      entry: [{
        id: "ig_business_123",
        messaging: [{
          sender: { id: "ig_user_456" },
          recipient: { id: "ig_business_123" },
          message: {
            mid: "ig_mid_handoff",
            text: "Quiero hablar con un humano",
          },
        }],
      }],
    });

    const result = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
      runAiReply: async () => {
        ranAi = true;
        return { ok: true };
      },
    });

    expect(result.body).toMatchObject({
      aiBlockedReason: "HANDOFF_REQUESTED",
      humanHandoffRequested: true,
    });
    expect(repository.persisted[0]?.aiBlockedReason).toBe("HANDOFF_REQUESTED");
    expect(repository.handoffs).toMatchObject([{
      conversationId: "conversation_123",
      messageId: "message_123",
      source: "customer_intent",
    }]);
    expect(repository.operationOrder).toEqual(["persist", "handoff", "enqueue"]);
    expect(ranAi).toBe(false);
  });


  it("keeps the webhook acknowledged and records the AI failure when reply generation fails", async () => {
    const repository = new MemoryChannelWebhookRepository(createContext());
    const body = JSON.stringify(createInstagramPayload());

    const result = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
      runAiReply: async () => {
        throw new Error("OPENAI_API_KEY_MISSING");
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      processed: true,
      aiReplyError: "OPENAI_API_KEY_MISSING",
    });
    expect(repository.aiFailures).toMatchObject([{
      conversationId: "conversation_123",
      messageId: "message_123",
      reason: "OPENAI_API_KEY_MISSING",
    }]);
  });
});

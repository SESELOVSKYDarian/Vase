import { describe, expect, it } from "vitest";
import type {
  ChannelWebhookContext,
  ChannelWebhookRepository,
  PersistChannelInboundMessageInput,
  PersistChannelInboundMessageResult,
} from "../apps/vase-labs/app/lib/channel-webhook-service";
import {
  getChannelWebhookVerifyResult,
  handleMetaChannelWebhook,
} from "../apps/vase-labs/app/lib/channel-webhook-service";
import { signMetaPayload } from "../apps/vase-labs/app/lib/meta-signature";
import { parseInstagramWebhookMessage } from "../apps/vase-labs/app/lib/instagram-webhook";

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

  constructor(private readonly context: ChannelWebhookContext | null) {}

  async findContextByTenantSlug() {
    return this.context;
  }

  async persistInboundMessage(input: PersistChannelInboundMessageInput): Promise<PersistChannelInboundMessageResult> {
    this.persisted.push(input);
    return {
      conversationId: "conversation_123",
      messageId: "message_123",
      aiBlockedReason: input.aiBlockedReason,
    };
  }

  async markAiReplyFailed(input: { conversationId: string; messageId: string; reason: string }) {
    this.aiFailures.push(input);
  }
}

describe("Vase Labs generic Meta channel webhook service", () => {
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
    expect(aiRuns[0]).toMatchObject({
      context: { assistantId: "assistant_123", globalTenantId: "tenant_123" },
      persisted: { conversationId: "conversation_123", messageId: "message_123" },
      message: { text: "Hola IG" },
    });
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

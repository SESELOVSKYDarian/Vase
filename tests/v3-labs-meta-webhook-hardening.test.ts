import { describe, expect, it } from "vitest";
import type {
  ChannelWebhookContext,
  ChannelWebhookRepository,
  PersistChannelInboundMessageInput,
  PersistChannelInboundMessageResult,
} from "../apps/vase-labs/app/lib/channel-webhook-service";
import { handleMetaChannelWebhook } from "../apps/vase-labs/app/lib/channel-webhook-service";
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
        appSecret: "secret",
        verifyToken: "verify-token",
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

function createInstagramPayload(mid = "ig_mid_123") {
  return {
    object: "instagram",
    entry: [{
      id: "ig_business_123",
      messaging: [{
        sender: { id: "ig_user_456" },
        recipient: { id: "ig_business_123" },
        message: {
          mid,
          text: "Hola IG",
        },
      }],
    }],
  };
}

class MemoryRepository implements ChannelWebhookRepository {
  persisted: PersistChannelInboundMessageInput[] = [];
  seen = new Set<string>();

  constructor(private readonly context: ChannelWebhookContext | null) {}

  async findContextByTenantSlug() {
    return this.context;
  }

  async markWebhookEventProcessing(input: { providerMessageId?: string | null }) {
    const key = input.providerMessageId ?? "";
    if (this.seen.has(key)) return { duplicate: true };
    this.seen.add(key);
    return { duplicate: false };
  }

  async persistInboundMessage(input: PersistChannelInboundMessageInput): Promise<PersistChannelInboundMessageResult> {
    this.persisted.push(input);
    return {
      conversationId: "conversation_123",
      messageId: "message_123",
      aiBlockedReason: input.aiBlockedReason,
    };
  }
}

describe("Vase Labs Meta webhook hardening", () => {
  it("verifies signatures with Vase's global Meta app secret, not channel config", async () => {
    const repository = new MemoryRepository(createContext({
      channel: {
        id: "channel_123",
        provider: "META_OFFICIAL",
        status: "CONNECTED",
        config: { verifyToken: "verify-token" },
      },
    }));
    const body = JSON.stringify(createInstagramPayload());

    const result = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("global-meta-secret", body)}`,
      appSecret: "global-meta-secret",
      parseMessage: parseInstagramWebhookMessage,
    });

    expect(result.body).toMatchObject({ ok: true, processed: true });
  });

  it("ignores messages for channels that are not connected", async () => {
    const repository = new MemoryRepository(createContext({
      channel: {
        id: "channel_123",
        provider: "META_OFFICIAL",
        status: "PENDING",
        config: { appSecret: "secret", verifyToken: "verify-token" },
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
    expect(result.body).toMatchObject({ ok: true, ignored: true, reason: "channel_not_connected" });
    expect(repository.persisted).toHaveLength(0);
  });

  it("deduplicates repeated provider messages before persistence", async () => {
    const repository = new MemoryRepository(createContext());
    const body = JSON.stringify(createInstagramPayload("ig_mid_dup"));

    await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
    });
    const retry = await handleMetaChannelWebhook({
      channelType: "INSTAGRAM",
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
      parseMessage: parseInstagramWebhookMessage,
    });

    expect(retry.body).toMatchObject({ ok: true, processed: false, reason: "duplicate" });
    expect(repository.persisted).toHaveLength(1);
  });
});

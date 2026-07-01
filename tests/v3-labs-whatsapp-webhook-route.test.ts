import { describe, expect, it } from "vitest";
import type {
  PersistInboundMessageInput,
  PersistInboundMessageResult,
  WhatsAppWebhookContext,
  WhatsAppWebhookRepository,
} from "../apps/vase-labs/app/lib/whatsapp-webhook-service";
import {
  getWebhookVerifyResult,
  handleWhatsAppMetaWebhook,
} from "../apps/vase-labs/app/lib/whatsapp-webhook-service";
import { signMetaPayload } from "../apps/vase-labs/app/lib/meta-signature";

function createContext(overrides: Partial<WhatsAppWebhookContext> = {}): WhatsAppWebhookContext {
  return {
    assistantId: "assistant_123",
    globalTenantId: "tenant_123",
    tenantSlug: "tenant-demo",
    channelType: "WHATSAPP",
    channel: {
      id: "channel_123",
      provider: "META_OFFICIAL",
      status: "CONNECTED",
      config: {
        provider: "META_OFFICIAL",
        appSecret: "secret",
        verifyToken: "verify-token",
        phoneNumberId: "phone_123",
        accessToken: "access-token",
      },
    },
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
    ...overrides,
  };
}

function createMetaPayload(message: Record<string, unknown> | null = {
  from: "5491122334455",
  id: "wamid.123",
  type: "text",
  text: { body: "Hola" },
}) {
  return {
    entry: [{
      changes: [{
        value: {
          contacts: [{ profile: { name: "Ana" }, wa_id: "5491122334455" }],
          messages: message ? [message] : undefined,
        },
      }],
    }],
  };
}

class MemoryWebhookRepository implements WhatsAppWebhookRepository {
  persisted: PersistInboundMessageInput[] = [];

  constructor(private readonly context: WhatsAppWebhookContext | null) {}

  async findContextByTenantSlug() {
    return this.context;
  }

  async persistInboundMessage(input: PersistInboundMessageInput): Promise<PersistInboundMessageResult> {
    this.persisted.push(input);
    return {
      conversationId: "conversation_123",
      messageId: "message_123",
      aiBlockedReason: input.aiBlockedReason,
    };
  }
}

describe("Vase Labs WhatsApp Meta webhook", () => {
  it("verifies the Meta hub.challenge with the channel token", () => {
    const result = getWebhookVerifyResult({
      context: createContext(),
      url: "https://labs.vase.ar/api/v1/channels/whatsapp/tenant-demo/webhook?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=abc123",
    });

    expect(result).toEqual({ status: 200, body: "abc123" });
  });

  it("rejects invalid Meta signatures", async () => {
    const repository = new MemoryWebhookRepository(createContext());
    const body = JSON.stringify(createMetaPayload());
    const result = await handleWhatsAppMetaWebhook({
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("wrong", body)}`,
    });

    expect(result.status).toBe(401);
    expect(result.body.reason).toBe("invalid_signature");
    expect(repository.persisted).toHaveLength(0);
  });

  it("normalizes and persists valid inbound WhatsApp messages", async () => {
    const repository = new MemoryWebhookRepository(createContext());
    const body = JSON.stringify(createMetaPayload());
    const result = await handleWhatsAppMetaWebhook({
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      processed: true,
      conversationId: "conversation_123",
      messageId: "message_123",
      aiBlockedReason: null,
    });
    expect(repository.persisted[0]?.message).toMatchObject({
      globalTenantId: "tenant_123",
      channelType: "WHATSAPP",
      externalThreadKey: "5491122334455",
      text: "Hola",
    });
  });

  it("persists inbound messages but blocks AI when WhatsApp is not entitled", async () => {
    const repository = new MemoryWebhookRepository(createContext({
      entitlement: {
        globalTenantId: "tenant_123",
        plan: "STARTER",
        status: "ACTIVE",
        enabledChannels: [],
        tokenPack: null,
        tokensIncluded: 50000,
        tokensUsed: 0,
        extraTokens: 0,
        currentPeriodStart: null,
        renewsAt: null,
      },
    }));
    const body = JSON.stringify(createMetaPayload());
    const result = await handleWhatsAppMetaWebhook({
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
    });

    expect(result.status).toBe(200);
    expect(result.body.aiBlockedReason).toBe("CHANNEL_NOT_ENTITLED");
    expect(repository.persisted[0]?.aiBlockedReason).toBe("CHANNEL_NOT_ENTITLED");
  });

  it("ignores Meta webhook payloads without messages", async () => {
    const repository = new MemoryWebhookRepository(createContext());
    const body = JSON.stringify(createMetaPayload(null));
    const result = await handleWhatsAppMetaWebhook({
      repository,
      tenantSlug: "tenant-demo",
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("secret", body)}`,
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, ignored: true });
    expect(repository.persisted).toHaveLength(0);
  });
});

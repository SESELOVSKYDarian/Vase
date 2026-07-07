import { describe, expect, it } from "vitest";
import type {
  ChannelWebhookContext,
  ChannelWebhookRepository,
} from "../apps/vase-labs/app/lib/channel-webhook-service";
import { handleGlobalMetaChannelWebhook } from "../apps/vase-labs/app/lib/channel-webhook-service";
import { parseFacebookWebhookMessage } from "../apps/vase-labs/app/lib/facebook-webhook";
import { signMetaPayload } from "../apps/vase-labs/app/lib/meta-signature";

describe("single Meta app global webhook", () => {
  it("routes an event to the tenant by the subscribed provider account id", async () => {
    const context: ChannelWebhookContext = {
      assistantId: "assistant_123",
      globalTenantId: "tenant_123",
      tenantSlug: "norte-equipos",
      channelType: "FACEBOOK",
      channel: {
        id: "channel_123",
        provider: "META_OFFICIAL",
        status: "CONNECTED",
        config: {},
      },
      entitlement: {
        globalTenantId: "tenant_123",
        plan: "PRO",
        status: "ACTIVE",
        enabledChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
        tokenPack: null,
        tokensIncluded: 1000,
        tokensUsed: 0,
        extraTokens: 0,
        currentPeriodStart: null,
        renewsAt: null,
      },
    };
    let resolvedAccountId = "";
    const repository: ChannelWebhookRepository = {
      async findContextByTenantSlug() {
        throw new Error("tenant route must not be used");
      },
      async findContextByProviderAccountId(_channelType, providerAccountId) {
        resolvedAccountId = providerAccountId;
        return context;
      },
      async persistInboundMessage() {
        return {
          conversationId: "conversation_123",
          messageId: "message_123",
          aiBlockedReason: null,
        };
      },
    };
    const body = JSON.stringify({
      object: "page",
      entry: [{
        id: "page_123",
        messaging: [{
          sender: { id: "customer_123" },
          recipient: { id: "page_123" },
          message: { mid: "mid_123", text: "Hola" },
        }],
      }],
    });

    const result = await handleGlobalMetaChannelWebhook({
      channelType: "FACEBOOK",
      repository,
      rawBody: body,
      signatureHeader: `sha256=${signMetaPayload("global-secret", body)}`,
      appSecret: "global-secret",
      parseMessage: parseFacebookWebhookMessage,
    });

    expect(resolvedAccountId).toBe("page_123");
    expect(result.body).toMatchObject({ ok: true, processed: true });
  });
});

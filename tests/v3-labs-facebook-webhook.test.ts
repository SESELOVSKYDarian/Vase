import { describe, expect, it } from "vitest";
import { parseFacebookWebhookMessage } from "../apps/vase-labs/app/lib/facebook-webhook";

describe("Vase Labs Facebook webhook parser", () => {
  it("normalizes Facebook Messenger text messages", () => {
    const rawMessage = {
      mid: "fb_mid_123",
      text: "Hola desde Facebook",
    };
    const message = parseFacebookWebhookMessage({
      globalTenantId: "tenant_123",
      payload: {
        object: "page",
        entry: [{
          id: "page_123",
          messaging: [{
            sender: { id: "fb_user_456" },
            recipient: { id: "page_123" },
            timestamp: 1710000000000,
            message: rawMessage,
          }],
        }],
      },
    });

    expect(message).toMatchObject({
      globalTenantId: "tenant_123",
      channelType: "FACEBOOK",
      externalThreadKey: "fb_user_456",
      externalMessageId: "fb_mid_123",
      customerContact: "fb_user_456",
      text: "Hola desde Facebook",
      messageType: "text",
      provider: "META_OFFICIAL",
      rawPayload: rawMessage,
    });
  });

  it("returns null for Facebook webhook payloads without messages", () => {
    expect(parseFacebookWebhookMessage({
      globalTenantId: "tenant_123",
      payload: { object: "page", entry: [{ id: "page_123", messaging: [] }] },
    })).toBeNull();
  });
});

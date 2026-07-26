import { describe, expect, it } from "vitest";
import { parseInstagramWebhookMessage } from "../apps/vase-labs/app/lib/instagram-webhook";

describe("Vase Labs Instagram webhook parser", () => {
  it("normalizes Instagram Messaging API text messages", () => {
    const rawMessage = {
      mid: "ig_mid_123",
      text: "Hola desde Instagram",
    };
    const message = parseInstagramWebhookMessage({
      globalTenantId: "tenant_123",
      payload: {
        object: "instagram",
        entry: [{
          id: "ig_business_123",
          messaging: [{
            sender: { id: "ig_user_456" },
            recipient: { id: "ig_business_123" },
            timestamp: 1710000000000,
            message: rawMessage,
          }],
        }],
      },
    });

    expect(message).toMatchObject({
      globalTenantId: "tenant_123",
      channelType: "INSTAGRAM",
      externalThreadKey: "ig_user_456",
      externalMessageId: "ig_mid_123",
      customerContact: "ig_user_456",
      text: "Hola desde Instagram",
      messageType: "text",
      provider: "META_OFFICIAL",
      rawPayload: rawMessage,
    });
  });

  it("returns null for Instagram webhook payloads without messages", () => {
    expect(parseInstagramWebhookMessage({
      globalTenantId: "tenant_123",
      payload: { object: "instagram", entry: [{ id: "ig_business_123", messaging: [] }] },
    })).toBeNull();
  });

  it("uses the first inbound message when Meta batches non-message or echo events first", () => {
    const message = parseInstagramWebhookMessage({
      globalTenantId: "tenant_123",
      payload: {
        object: "instagram",
        entry: [{
          id: "ig_business_123",
          messaging: [
            {
              sender: { id: "ig_business_123" },
              recipient: { id: "ig_user_456" },
              message: { mid: "echo_mid", text: "Respuesta propia", is_echo: true },
            },
            {
              sender: { id: "ig_user_456" },
              recipient: { id: "ig_business_123" },
              message: { mid: "ig_mid_456", text: "Hola, quiero comprar" },
            },
          ],
        }],
      },
    });

    expect(message).toMatchObject({
      externalThreadKey: "ig_user_456",
      externalMessageId: "ig_mid_456",
      text: "Hola, quiero comprar",
      messageType: "text",
    });
  });
});

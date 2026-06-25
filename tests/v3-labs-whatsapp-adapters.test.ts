import { describe, expect, it } from "vitest";
import { generateMetaWebhookVerifyToken } from "../apps/vase-labs/app/lib/meta-webhook";
import { signMetaPayload, verifyMetaSignature } from "../apps/vase-labs/app/lib/meta-signature";
import { readWhatsAppProviderConfig } from "../apps/vase-labs/app/lib/whatsapp-provider";
import { parseWhatsAppWebhookMessage } from "../apps/vase-labs/app/lib/whatsapp-webhook";

describe("Vase Labs WhatsApp adapters", () => {
  it("verifies Meta webhook signatures", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = `sha256=${signMetaPayload("secret", body)}`;

    expect(verifyMetaSignature("secret", body, signature)).toBe(true);
    expect(verifyMetaSignature("wrong", body, signature)).toBe(false);
  });

  it("generates deterministic tenant verify tokens", () => {
    expect(generateMetaWebhookVerifyToken("Tenant_Demo")).toBe(generateMetaWebhookVerifyToken("tenant_demo"));
    expect(generateMetaWebhookVerifyToken("tenant_demo")).toMatch(/^vase_meta_[a-f0-9]{32}$/);
  });

  it("normalizes WhatsApp Meta webhook messages", () => {
    const message = parseWhatsAppWebhookMessage({
      globalTenantId: "tenant_123",
      payload: {
        entry: [{
          changes: [{
            value: {
              contacts: [{ profile: { name: "Ana" }, wa_id: "5491122334455" }],
              messages: [{
                from: "5491122334455",
                id: "wamid.123",
                type: "text",
                text: { body: "Hola" },
              }],
            },
          }],
        }],
      },
    });

    expect(message).toMatchObject({
      globalTenantId: "tenant_123",
      channelType: "WHATSAPP",
      externalThreadKey: "5491122334455",
      externalMessageId: "wamid.123",
      customerName: "Ana",
      customerContact: "5491122334455",
      text: "Hola",
      messageType: "text",
      provider: "META_OFFICIAL",
    });
  });

  it("reads WhatsApp provider config without monolith dependencies", () => {
    expect(readWhatsAppProviderConfig({
      provider: "META_OFFICIAL",
      accessToken: "token",
      phoneNumberId: "phone_123",
      appSecret: "secret",
      wabaId: "waba_123",
    })).toMatchObject({
      provider: "META_OFFICIAL",
      accessToken: "token",
      phoneNumberId: "phone_123",
      appSecret: "secret",
      wabaId: "waba_123",
    });
  });
});

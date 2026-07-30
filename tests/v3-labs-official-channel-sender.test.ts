import { describe, expect, it, vi } from "vitest";
import { encryptChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";
import {
  createOfficialChannelSender,
  OfficialChannelDeliveryError,
} from "../apps/vase-labs/app/lib/official-channel-sender";

const encryptionSecret = "0123456789abcdef0123456789abcdef";

describe("official Meta outbound sender", () => {
  it("sends Facebook replies with the encrypted Page token and account id", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "FACEBOOK",
            providerAccountId: "page_123",
            encryptedAccessToken: encryptChannelSecret("page-token", encryptionSecret),
          };
        },
      },
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({ message_id: "mid_123" });
      },
    });

    await expect(
      sender.send({
        globalTenantId: "tenant_123",
        channelType: "FACEBOOK",
        recipientId: "psid_123",
        text: "Hola",
      }),
    ).resolves.toEqual({ ok: true, providerMessageId: "mid_123" });

    expect(requests[0]?.url).toBe(
      "https://graph.facebook.com/v99.0/page_123/messages",
    );
    expect(new Headers(requests[0]?.init?.headers).get("authorization")).toBe(
      "Bearer page-token",
    );
  });

  it("sends WhatsApp text first and only three unique public HTTPS images afterward", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const findDeliveryContext = vi.fn(async () => ({
      channelType: "WHATSAPP" as const,
      providerAccountId: "phone_123",
      encryptedAccessToken: encryptChannelSecret("whatsapp-token", encryptionSecret),
    }));
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: { findDeliveryContext },
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({
          messages: [{ id: requests.length === 1 ? "wamid_text" : `wamid_image_${requests.length - 1}` }],
        });
      },
    });

    await expect(sender.send({
      globalTenantId: "tenant_123",
      channelType: "WHATSAPP",
      recipientId: "549223",
      text: "Te muestro los productos.",
      imageUrls: [
        "https://cdn.vase.ar/p1.jpg",
        "https://cdn.vase.ar/p1.jpg",
        "http://cdn.vase.ar/insecure.jpg",
        "https://cdn.vase.ar/p2.jpg",
        "https://localhost/private.jpg",
        "https://cdn.vase.ar/p3.jpg",
        "https://cdn.vase.ar/p4.jpg",
      ],
    })).resolves.toEqual({ ok: true, providerMessageId: "wamid_text" });

    expect(findDeliveryContext).toHaveBeenCalledTimes(1);
    expect(requests.map((request) => JSON.parse(request.init?.body as string))).toEqual([
      {
        messaging_product: "whatsapp",
        to: "549223",
        type: "text",
        text: { body: "Te muestro los productos." },
      },
      {
        messaging_product: "whatsapp",
        to: "549223",
        type: "image",
        image: { link: "https://cdn.vase.ar/p1.jpg" },
      },
      {
        messaging_product: "whatsapp",
        to: "549223",
        type: "image",
        image: { link: "https://cdn.vase.ar/p2.jpg" },
      },
      {
        messaging_product: "whatsapp",
        to: "549223",
        type: "image",
        image: { link: "https://cdn.vase.ar/p3.jpg" },
      },
    ]);
  });

  it("sends Instagram image attachments with URL-only payloads after the text", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "INSTAGRAM",
            providerAccountId: "account_123",
            encryptedAccessToken: encryptChannelSecret("page-token", encryptionSecret),
          };
        },
      },
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({ message_id: requests.length === 1 ? "mid_text" : "mid_image" });
      },
    });

    await expect(sender.send({
      globalTenantId: "tenant_123",
      channelType: "INSTAGRAM",
      recipientId: "customer_123",
      text: "Te lo muestro.",
      imageUrls: ["https://cdn.vase.ar/p1.jpg"],
    })).resolves.toEqual({ ok: true, providerMessageId: "mid_text" });

    const payloads = requests.map((request) => JSON.parse(request.init?.body as string));
    expect(payloads[0]).toEqual({
      recipient: { id: "customer_123" },
      message: { text: "Te lo muestro." },
    });
    expect(payloads[1]).toEqual({
      recipient: { id: "customer_123" },
      message: {
        attachment: {
          type: "image",
          payload: { url: "https://cdn.vase.ar/p1.jpg" },
        },
      },
    });
  });

  it("sends Instagram Login replies through graph.instagram.com", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "INSTAGRAM",
            providerAccountId: "17841428932871922",
            encryptedAccessToken: encryptChannelSecret("IGAA-token", encryptionSecret),
          };
        },
      },
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({ message_id: "mid_ig" });
      },
    });

    await expect(sender.send({
      globalTenantId: "tenant_123",
      channelType: "INSTAGRAM",
      recipientId: "customer_123",
      text: "Hola desde IA",
    })).resolves.toEqual({ ok: true, providerMessageId: "mid_ig" });

    expect(requests[0]?.url).toBe(
      "https://graph.instagram.com/v99.0/17841428932871922/messages",
    );
    expect(new Headers(requests[0]?.init?.headers).get("authorization")).toBe(
      "Bearer IGAA-token",
    );
    expect(JSON.parse(requests[0]?.init?.body as string)).toEqual({
      recipient: { id: "customer_123" },
      message: { text: "Hola desde IA" },
    });
  });

  it("sends Facebook reusable image attachments after the text", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "FACEBOOK",
            providerAccountId: "account_123",
            encryptedAccessToken: encryptChannelSecret("page-token", encryptionSecret),
          };
        },
      },
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({ message_id: requests.length === 1 ? "mid_text" : "mid_image" });
      },
    });

    await expect(sender.send({
      globalTenantId: "tenant_123",
      channelType: "FACEBOOK",
      recipientId: "customer_123",
      text: "Te lo muestro.",
      imageUrls: ["https://cdn.vase.ar/p1.jpg"],
    })).resolves.toEqual({ ok: true, providerMessageId: "mid_text" });

    const payloads = requests.map((request) => JSON.parse(request.init?.body as string));
    expect(payloads[0]).toEqual({
      recipient: { id: "customer_123" },
      messaging_type: "RESPONSE",
      message: { text: "Te lo muestro." },
    });
    expect(payloads[1]).toEqual({
      recipient: { id: "customer_123" },
      messaging_type: "RESPONSE",
      message: {
        attachment: {
          type: "image",
          payload: { url: "https://cdn.vase.ar/p1.jpg", is_reusable: true },
        },
      },
    });
  });

  it("stops after a failed image and throws META_SEND_FAILED", async () => {
    const requests: RequestInit[] = [];
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "FACEBOOK",
            providerAccountId: "page_123",
            encryptedAccessToken: encryptChannelSecret("page-token", encryptionSecret),
          };
        },
      },
      fetcher: async (_url, init) => {
        requests.push(init ?? {});
        return requests.length === 2
          ? Response.json({ error: { message: "rejected" } }, { status: 400 })
          : Response.json({ message_id: "mid_text" });
      },
    });

    await expect(sender.send({
      globalTenantId: "tenant_123",
      channelType: "FACEBOOK",
      recipientId: "customer_123",
      text: "Te lo muestro.",
      imageUrls: [
        "https://cdn.vase.ar/p1.jpg",
        "https://cdn.vase.ar/p2.jpg",
      ],
    })).rejects.toThrow("META_SEND_FAILED");

    expect(requests).toHaveLength(2);
  });

  it("refuses delivery when the official channel is disconnected", async () => {
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return null;
        },
      },
    });

    await expect(
      sender.send({
        globalTenantId: "tenant_123",
        channelType: "INSTAGRAM",
        recipientId: "igid_123",
        text: "Hola",
      }),
    ).rejects.toThrow("OFFICIAL_CHANNEL_NOT_CONNECTED");
  });

  it("returns a safe Meta status and message when delivery is rejected", async () => {
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "WHATSAPP",
            providerAccountId: "phone_123",
            encryptedAccessToken: encryptChannelSecret("token", encryptionSecret),
          };
        },
      },
      fetcher: async () => Response.json({
        error: { message: "(#131030) Recipient phone number not in allowed list" },
      }, { status: 400 }),
    });

    const error = await sender.send({
      globalTenantId: "tenant_123",
      channelType: "WHATSAPP",
      recipientId: "549223",
      text: "Hola",
    }).catch((reason) => reason);

    expect(error).toBeInstanceOf(OfficialChannelDeliveryError);
    expect(error).toMatchObject({
      code: "META_SEND_FAILED",
      providerStatus: 400,
      providerMessage: "(#131030) Recipient phone number not in allowed list",
    });
    expect(error.message).toContain("(#131030) Recipient phone number not in allowed list");
  });

  it("does not report a Facebook reply as sent without Meta's message id", async () => {
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "FACEBOOK",
            providerAccountId: "page_123",
            encryptedAccessToken: encryptChannelSecret("page-token", encryptionSecret),
          };
        },
      },
      fetcher: async () => Response.json({ recipient_id: "psid_123" }),
    });

    await expect(sender.send({
      globalTenantId: "tenant_123",
      channelType: "FACEBOOK",
      recipientId: "psid_123",
      text: "Hola",
    })).rejects.toMatchObject({
      code: "META_SEND_UNCONFIRMED",
      providerStatus: 200,
    });
  });

  it("requests the exact Facebook channel that received the inbound message", async () => {
    const findDeliveryContext = vi.fn(async () => ({
      channelType: "FACEBOOK" as const,
      providerAccountId: "page_123",
      encryptedAccessToken: encryptChannelSecret("page-token", encryptionSecret),
    }));
    const sender = createOfficialChannelSender({
      encryptionSecret,
      graphVersion: "v99.0",
      repository: { findDeliveryContext },
      fetcher: async () => Response.json({ message_id: "mid_123" }),
    });

    await sender.send({
      globalTenantId: "tenant_123",
      channelId: "facebook_channel_123",
      channelType: "FACEBOOK",
      recipientId: "psid_123",
      text: "Hola",
    });

    expect(findDeliveryContext).toHaveBeenCalledWith({
      globalTenantId: "tenant_123",
      channelId: "facebook_channel_123",
      channelType: "FACEBOOK",
    });
  });

  it("classifies an incompatible encryption key without exposing ciphertext", async () => {
    const sender = createOfficialChannelSender({
      encryptionSecret: "different-secret",
      graphVersion: "v99.0",
      repository: {
        async findDeliveryContext() {
          return {
            channelType: "WHATSAPP",
            providerAccountId: "phone_123",
            encryptedAccessToken: encryptChannelSecret("token", encryptionSecret),
          };
        },
      },
    });

    await expect(sender.send({
      globalTenantId: "tenant_123",
      channelType: "WHATSAPP",
      recipientId: "549223",
      text: "Hola",
    })).rejects.toMatchObject({ code: "CHANNEL_CREDENTIAL_DECRYPTION_FAILED" });
  });
});

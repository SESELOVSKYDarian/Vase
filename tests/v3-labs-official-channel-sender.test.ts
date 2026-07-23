import { describe, expect, it, vi } from "vitest";
import { encryptChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";
import { createOfficialChannelSender } from "../apps/vase-labs/app/lib/official-channel-sender";

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

  it.each(["INSTAGRAM", "FACEBOOK"] as const)(
    "sends %s image attachments after the text",
    async (channelType) => {
      const requests: Array<{ url: string; init?: RequestInit }> = [];
      const sender = createOfficialChannelSender({
        encryptionSecret,
        graphVersion: "v99.0",
        repository: {
          async findDeliveryContext() {
            return {
              channelType,
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
        channelType,
        recipientId: "customer_123",
        text: "Te lo muestro.",
        imageUrls: ["https://cdn.vase.ar/p1.jpg"],
      })).resolves.toEqual({ ok: true, providerMessageId: "mid_text" });

      const payloads = requests.map((request) => JSON.parse(request.init?.body as string));
      expect(payloads[0]).toEqual({
        recipient: { id: "customer_123" },
        ...(channelType === "FACEBOOK" ? { messaging_type: "RESPONSE" } : {}),
        message: { text: "Te lo muestro." },
      });
      expect(payloads[1]).toEqual({
        recipient: { id: "customer_123" },
        ...(channelType === "FACEBOOK" ? { messaging_type: "RESPONSE" } : {}),
        message: {
          attachment: {
            type: "image",
            payload: { url: "https://cdn.vase.ar/p1.jpg", is_reusable: true },
          },
        },
      });
    },
  );

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
});

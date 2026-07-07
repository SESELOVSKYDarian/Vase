import { describe, expect, it } from "vitest";
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

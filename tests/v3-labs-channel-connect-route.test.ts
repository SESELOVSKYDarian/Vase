import { afterEach, describe, expect, it, vi } from "vitest";

const graph = {
  resolveManualAsset: vi.fn().mockResolvedValue({
    candidate: { id: "phone_1", kind: "WHATSAPP_PHONE", name: "Ventas", parentId: "waba_1" },
    parentId: "waba_1",
  }),
  verifyAndSubscribe: vi.fn().mockResolvedValue({
    providerAccountId: "phone_1",
    accountLabel: "Ventas",
    externalHandle: "+54",
    config: { parentId: "waba_1", subscribedFields: ["messages"] },
    accessToken: "token",
  }),
};

vi.mock("../apps/vase-labs/app/lib/request-context", () => ({
  resolveLabsRequestContext: vi.fn().mockResolvedValue({ assistant: { id: "assistant_1" } }),
}));

vi.mock("../apps/vase-labs/app/lib/db", () => ({
  Prisma: {},
  labsPrisma: {
    channelSecret: { findFirst: vi.fn(), upsert: vi.fn().mockResolvedValue({}) },
    channel: {
      findFirst: vi.fn().mockResolvedValue({ id: "channel_1", type: "WHATSAPP", webhookVerifiedAt: null }),
      findUnique: vi.fn().mockResolvedValue({ type: "WHATSAPP" }),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../apps/vase-labs/app/lib/meta-graph", () => ({
  createMetaGraphClient: vi.fn(() => graph),
}));

function request(body: unknown) {
  return new Request("https://labs.vase.ar/api/labs/channels/channel_1/connect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Labs channel connect route", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("connects manual channel credentials with the client Meta app secret", async () => {
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.META_OAUTH_REDIRECT_URI;
    process.env.META_GRAPH_VERSION = "v25.0";
    process.env.TOKEN_ENCRYPTION_SECRET = "encryption-secret";
    const route = await import("../apps/vase-labs/app/api/labs/channels/[channelId]/connect/route");

    const response = await route.POST(
      request({ channelType: "WHATSAPP", accessToken: "token", metaAppId: "client-app-id", appSecret: "client-app-secret", providerAccountId: "phone_1", parentId: "waba_1" }),
      { params: Promise.resolve({ channelId: "channel_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("PENDING");
    expect(graph.resolveManualAsset).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "token", providerAccountId: "phone_1", parentId: "waba_1" }));
    const { createMetaGraphClient } = await import("../apps/vase-labs/app/lib/meta-graph");
    expect(createMetaGraphClient).toHaveBeenCalledWith(expect.objectContaining({
      appId: "client-app-id",
      appSecret: "client-app-secret",
    }));
    const { labsPrisma } = await import("../apps/vase-labs/app/lib/db");
    expect(labsPrisma.channel.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        config: expect.objectContaining({ metaAppId: "client-app-id" }),
      }),
    }));
    expect(labsPrisma.channelSecret.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { channelId_kind: { channelId: "channel_1", kind: "META_APP_SECRET" } },
    }));
  });

  it("asks for the access token again when the stored token cannot be decrypted", async () => {
    process.env.TOKEN_ENCRYPTION_SECRET = "new-encryption-secret";
    const { labsPrisma } = await import("../apps/vase-labs/app/lib/db");
    vi.mocked(labsPrisma.channelSecret.findFirst).mockResolvedValueOnce({ encryptedValue: "encrypted-with-old-secret" });
    const route = await import("../apps/vase-labs/app/api/labs/channels/[channelId]/connect/route");

    const response = await route.POST(
      request({ channelType: "WHATSAPP", metaAppId: "client-app-id", providerAccountId: "phone_1", parentId: "waba_1" }),
      { params: Promise.resolve({ channelId: "channel_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("CHANNEL_CREDENTIAL_REENTER_REQUIRED");
  });
});

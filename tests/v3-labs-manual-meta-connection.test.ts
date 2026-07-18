import { describe, expect, it, vi } from "vitest";
import { createManualMetaConnectionService } from "../apps/vase-labs/app/lib/manual-meta-connection";

describe("manual Meta connection", () => {
  it("validates the selected asset and stays pending until the webhook is verified", async () => {
    const save = vi.fn();
    const service = createManualMetaConnectionService({
      graph: {
        resolveManualAsset: vi.fn().mockResolvedValue({
          candidate: { id: "phone_1", kind: "WHATSAPP_PHONE", name: "Ventas", parentId: "waba_1" },
          parentId: "waba_1",
        }),
        verifyAndSubscribe: vi.fn().mockResolvedValue({
          providerAccountId: "phone_1", accountLabel: "Ventas", externalHandle: "+54", config: { parentId: "waba_1", subscribedFields: ["messages"] }, accessToken: "token",
        }),
      },
      repository: {
        find: vi.fn().mockResolvedValue({ id: "channel_1", type: "WHATSAPP", webhookVerifiedAt: null }),
        stage: vi.fn(), fail: vi.fn(),
        save,
      },
      encrypt: (value) => `encrypted:${value}`,
    });

    await expect(service.connect({ assistantId: "a", channelId: "channel_1", channelType: "WHATSAPP", accessToken: "token", providerAccountId: "phone_1", parentId: "waba_1" }))
      .resolves.toEqual({ status: "PENDING" });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING", encryptedAccessToken: "encrypted:token", phoneNumberId: "phone_1", wabaId: "waba_1" }));
  });

  it("rejects identifiers that are not associated with the token", async () => {
    const stage = vi.fn();
    const fail = vi.fn();
    const service = createManualMetaConnectionService({
      graph: { resolveManualAsset: vi.fn().mockRejectedValue(new Error("META_ASSET_NOT_AUTHORIZED")), verifyAndSubscribe: vi.fn() },
      repository: { find: vi.fn().mockResolvedValue({ id: "channel_1", type: "FACEBOOK", webhookVerifiedAt: new Date() }), stage, save: vi.fn(), fail },
      encrypt: (value) => `encrypted:${value}`,
    });
    await expect(service.connect({ assistantId: "a", channelId: "channel_1", channelType: "FACEBOOK", accessToken: "token", providerAccountId: "page_fake", parentId: null }))
      .rejects.toThrow("META_ASSET_NOT_AUTHORIZED");
    expect(stage).toHaveBeenCalledWith(expect.objectContaining({ channelId:"channel_1", providerAccountId:"page_fake", encryptedAccessToken:"encrypted:token" }));
    expect(fail).toHaveBeenCalledWith("channel_1", "META_ASSET_NOT_AUTHORIZED");
  });
});

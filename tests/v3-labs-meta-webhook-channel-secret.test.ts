import { describe, expect, it, vi } from "vitest";
import { encryptChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";
import { resolveMetaWebhookAppSecret } from "../apps/vase-labs/app/lib/meta-webhook-channel-secret";

describe("Meta webhook app secret per channel", () => {
  it("decrypts the client channel app secret before falling back to service configuration", async () => {
    const encryptionSecret = "labs-encryption-secret";
    const findFirst = vi.fn().mockResolvedValue({
      encryptedValue: encryptChannelSecret("client-meta-app-secret", encryptionSecret),
    });

    await expect(resolveMetaWebhookAppSecret({
      prisma: { channelSecret: { findFirst } } as never,
      tenantSlug: "sanitarios-el-teflon",
      channelType: "WHATSAPP",
      env: {
        TOKEN_ENCRYPTION_SECRET: encryptionSecret,
        META_APP_SECRET: "global-fallback-secret",
      } as NodeJS.ProcessEnv,
    })).resolves.toBe("client-meta-app-secret");

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ kind: "META_APP_SECRET" }),
    }));
  });

  it("uses the service secret only when the channel has no app secret", async () => {
    await expect(resolveMetaWebhookAppSecret({
      prisma: { channelSecret: { findFirst: vi.fn().mockResolvedValue(null) } } as never,
      tenantSlug: "tenant-demo",
      channelType: "WHATSAPP",
      env: { META_APP_SECRET: "global-fallback-secret" } as NodeJS.ProcessEnv,
    })).resolves.toBe("global-fallback-secret");
  });
});

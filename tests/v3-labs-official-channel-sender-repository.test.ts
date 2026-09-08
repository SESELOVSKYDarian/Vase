import { describe, expect, it, vi } from "vitest";
import { PrismaOfficialChannelSenderRepository } from "../apps/vase-labs/app/lib/official-channel-sender-repository";

describe("official channel sender repository", () => {
  it("recovers a legacy pending channel whose complete Meta setup is still valid", async () => {
    const findFirst = vi.fn(async (query: any) => {
      if (query.where.status === "CONNECTED") return null;
      return {
        type: "INSTAGRAM",
        status: "PENDING",
        providerAccountId: "ig-professional-account",
        webhookVerifiedAt: new Date(),
        lastError: null,
        config: { validationPending: false, subscribedFields: ["messages"] },
        secrets: [{ encryptedValue: "encrypted-token" }],
      };
    });
    const repository = new PrismaOfficialChannelSenderRepository({ channel: { findFirst } } as any);

    await expect(repository.findDeliveryContext({
      globalTenantId: "tenant",
      channelType: "INSTAGRAM",
    })).resolves.toMatchObject({
      providerAccountId: "ig-professional-account",
      encryptedAccessToken: "encrypted-token",
    });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ["CONNECTED", "PENDING"] } }),
    }));
  });
});

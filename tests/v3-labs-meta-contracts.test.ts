import { describe, expect, it } from "vitest";
import {
  labsChannelSchema,
  metaConnectionAttemptSchema,
  redactedChannelSummarySchema,
} from "../packages/contracts/src/index";

describe("official Meta channel contracts", () => {
  it("exposes exactly the three supported official channels", () => {
    expect(labsChannelSchema.options).toEqual(["WHATSAPP", "INSTAGRAM", "FACEBOOK"]);
    expect(labsChannelSchema.safeParse("WEBCHAT").success).toBe(false);
  });

  it("represents an OAuth attempt without carrying access tokens", () => {
    const attempt = metaConnectionAttemptSchema.parse({
      id: "attempt_123",
      channelType: "INSTAGRAM",
      status: "SELECTING_ASSET",
      expiresAt: "2026-07-06T20:00:00.000Z",
      candidates: [{
        id: "ig_123",
        kind: "INSTAGRAM_ACCOUNT",
        name: "Vase",
        handle: "@vasecorp",
        parentId: "page_123",
      }],
      errorCode: null,
    });

    expect(JSON.stringify(attempt)).not.toContain("accessToken");
  });

  it("returns redacted channel summaries with no secret configuration", () => {
    const summary = redactedChannelSummarySchema.parse({
      id: "channel_123",
      type: "FACEBOOK",
      provider: "META_OFFICIAL",
      status: "CONNECTED",
      accountLabel: "Vase",
      externalHandle: "@vase",
      providerAccountId: "page_123",
      connectedAt: "2026-07-06T20:00:00.000Z",
      lastSyncedAt: null,
      lastError: null,
      secretStatus: "CONFIGURED",
      webhookVerified: true,
      credentialsPresent: true,
      assetVerified: true,
      subscriptionActive: true,
    });

    expect(summary.secretStatus).toBe("CONFIGURED");
    expect(summary).not.toHaveProperty("config");
    expect(summary.webhookVerified).toBe(true);
  });
});

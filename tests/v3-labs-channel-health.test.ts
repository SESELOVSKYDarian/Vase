import { describe, expect, it } from "vitest";
import { resolveChannelConnectionStatus } from "../apps/vase-labs/app/lib/channel-health";

describe("channel connection readiness", () => {
  it("connects only when webhook, credentials, asset and subscription are ready", () => {
    expect(resolveChannelConnectionStatus({ webhookVerified:true, credentialsPresent:true, assetVerified:true, subscriptionActive:true })).toBe("CONNECTED");
    expect(resolveChannelConnectionStatus({ webhookVerified:true, credentialsPresent:false, assetVerified:true, subscriptionActive:true })).toBe("PENDING");
    expect(resolveChannelConnectionStatus({ webhookVerified:false, credentialsPresent:true, assetVerified:true, subscriptionActive:true })).toBe("PENDING");
  });
});

import { describe, expect, it } from "vitest";
import {
  hasMetaChannelCredentials,
  isMetaAssetVerified,
  resolveChannelConnectionStatus,
} from "../apps/vase-labs/app/lib/channel-health";

describe("channel connection readiness", () => {
  it("connects only when webhook, credentials, asset and subscription are ready", () => {
    expect(resolveChannelConnectionStatus({ webhookVerified:true, credentialsPresent:true, assetVerified:true, subscriptionActive:true })).toBe("CONNECTED");
    expect(resolveChannelConnectionStatus({ webhookVerified:true, credentialsPresent:false, assetVerified:true, subscriptionActive:true })).toBe("PENDING");
    expect(resolveChannelConnectionStatus({ webhookVerified:false, credentialsPresent:true, assetVerified:true, subscriptionActive:true })).toBe("PENDING");
  });

  it("does not report a staged or failed Meta asset as validated", () => {
    expect(isMetaAssetVerified({
      providerAccountId: "page_1",
      config: { validationPending: true },
      lastError: null,
    })).toBe(false);
    expect(isMetaAssetVerified({
      providerAccountId: "page_1",
      config: {},
      lastError: "META_ASSET_NOT_AUTHORIZED",
    })).toBe(false);
    expect(isMetaAssetVerified({
      providerAccountId: "page_1",
      config: { subscribedFields: ["messages"] },
      lastError: null,
    })).toBe(true);
  });

  it("requires the client app id, app secret and access token", () => {
    expect(hasMetaChannelCredentials({
      secretKinds: ["META_ACCESS_TOKEN", "META_APP_SECRET"],
      config: { metaAppId: "app_1" },
    })).toBe(true);
    expect(hasMetaChannelCredentials({
      secretKinds: ["META_ACCESS_TOKEN", "META_APP_SECRET"],
      config: {},
    })).toBe(false);
  });
});

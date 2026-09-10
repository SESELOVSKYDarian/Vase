import { describe, expect, it } from "vitest";
import {
  hasMetaChannelCredentials,
  isMetaAssetVerified,
  channelNeedsAttention,
  hasMessagingPermission,
  resolveChannelConnectionStatus,
  resolveOperationalChannelStatus,
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
    expect(isMetaAssetVerified({
      providerAccountId: "page_1",
      config: { subscribedFields: ["messages"] },
      lastError: "webhook_failed: temporary processing error",
    })).toBe(true);
    expect(isMetaAssetVerified({
      providerAccountId: "page_1",
      config: { subscribedFields: ["messages"] },
      lastError: "META_SEND_FAILED: HTTP 400",
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

  it("requires a verified messaging permission in addition to the subscription", () => {
    expect(hasMessagingPermission({ subscribedFields: ["messages"], messagingPermissionVerified: true })).toBe(true);
    expect(hasMessagingPermission({ subscribedFields: ["messages"] })).toBe(true);
    expect(hasMessagingPermission({ subscribedFields: ["messages"], messagingPermissionVerified: false })).toBe(false);
  });

  it("does not treat a historical last error as an active problem when health is green", () => {
    expect(channelNeedsAttention({
      status: "CONNECTED",
      health: { webhookVerified: true, credentialsPresent: true, assetVerified: true, subscriptionActive: true },
    })).toBe(false);
    expect(channelNeedsAttention({
      status: "ERROR",
      health: { webhookVerified: true, credentialsPresent: true, assetVerified: true, subscriptionActive: true },
    })).toBe(true);
    expect(channelNeedsAttention({
      status: "CONNECTED",
      health: { webhookVerified: true, credentialsPresent: true, assetVerified: false, subscriptionActive: true },
    })).toBe(false);
  });

  it("shows a legacy pending channel as connected when every operational check is valid", () => {
    expect(resolveOperationalChannelStatus({
      persistedStatus: "PENDING",
      health: { webhookVerified: true, credentialsPresent: true, assetVerified: true, subscriptionActive: true },
      messagingPermission: true,
    })).toBe("CONNECTED");
  });
});

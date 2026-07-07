import { describe, expect, it } from "vitest";
import { decryptChannelSecret, encryptChannelSecret, redactChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";
import { createMetaOAuthService } from "../apps/vase-labs/app/lib/meta-oauth";

describe("Vase Labs Meta OAuth and channel secrets", () => {
  it("encrypts channel secrets without storing the plain token", () => {
    const key = "0123456789abcdef0123456789abcdef";
    const encrypted = encryptChannelSecret("meta-access-token", key);

    expect(encrypted).not.toContain("meta-access-token");
    expect(decryptChannelSecret(encrypted, key)).toBe("meta-access-token");
    expect(redactChannelSecret(encrypted)).toBe("secret_configured");
  });

  it("generates a signed OAuth URL with channel-specific scopes", () => {
    const service = createMetaOAuthService({
      appId: "app_123",
      appSecret: "app_secret",
      redirectUri: "https://labs.vase.ar/api/v1/meta/oauth/callback",
      stateSecret: "state-secret",
    });

    const result = service.createAuthorizationUrl({
      attemptId: "attempt_instagram",
      globalUserId: "user_123",
      globalTenantId: "tenant_123",
      tenantSlug: "tenant-demo",
      channelType: "INSTAGRAM",
    });
    const url = new URL(result.authorizationUrl);

    expect(url.hostname).toBe("www.facebook.com");
    expect(url.searchParams.get("client_id")).toBe("app_123");
    expect(url.searchParams.get("redirect_uri")).toBe("https://labs.vase.ar/api/v1/meta/oauth/callback");
    expect(url.searchParams.get("scope")).toContain("instagram_manage_messages");
    expect(result.state).toContain(".");
    expect(service.verifyState(result.state)).toMatchObject({
      tenantSlug: "tenant-demo",
      channelType: "INSTAGRAM",
    });
  });

  it("binds OAuth state to the user, tenant and one connection attempt", () => {
    const service = createMetaOAuthService({
      appId: "app_123",
      appSecret: "app_secret",
      redirectUri: "https://labs.vase.ar/api/v1/meta/oauth/callback",
      stateSecret: "state-secret",
      whatsappConfigId: "wa-config-123",
    });

    const result = service.createAuthorizationUrl({
      attemptId: "attempt_123",
      globalUserId: "user_123",
      globalTenantId: "tenant_123",
      tenantSlug: "tenant-demo",
      channelType: "WHATSAPP",
    });
    const url = new URL(result.authorizationUrl);

    expect(url.searchParams.get("config_id")).toBe("wa-config-123");
    expect(service.verifyState(result.state)).toMatchObject({
      attemptId: "attempt_123",
      globalUserId: "user_123",
      globalTenantId: "tenant_123",
      channelType: "WHATSAPP",
    });
  });
});

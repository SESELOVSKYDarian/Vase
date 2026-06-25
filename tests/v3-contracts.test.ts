import { describe, expect, it } from "vitest";
import {
  aiHandoffRequestSchema,
  canUseInboundChannelMessage,
  canUseLabsChannel,
  channelConnectionStatusSchema,
  createLabsEntitlement,
  createTokenUsage,
  entitlementSchema,
  estimateMessagesFromTokenPack,
  estimateMessagesFromTokens,
  getLabsPlanLimits,
  getLabsTokenBalance,
  getTokenPackTokens,
  labsAdminTenantControlSchema,
  labsChannelSchema,
  labsChannelProviderSchema,
  labsEntitlementSchema,
  labsPlanSchema,
  outboundChannelMessageSchema,
  serviceHealthSchema,
  tokenPackSchema,
  tokenUsageSchema,
  vaseServiceKeySchema,
  whatsappProviderConfigSchema,
} from "../packages/contracts/src/index";
import {
  assertServiceToken,
  createInternalAdminHealthPayload,
} from "../packages/internal-api/src/index";

describe("V3 contracts", () => {
  it("validates service health payloads", () => {
    const payload = serviceHealthSchema.parse({
      service: "vase-app",
      domain: "app.vase.ar",
      status: "ok",
      timestamp: "2026-06-23T10:00:00.000Z",
    });

    expect(payload.service).toBe("vase-app");
  });

  it("validates product entitlements", () => {
    const entitlement = entitlementSchema.parse({
      globalTenantId: "tenant_123",
      productKey: "management",
      status: "ACTIVE",
    });

    expect(entitlement.productKey).toBe("management");
  });

  it("validates AI handoff requests", () => {
    const handoff = aiHandoffRequestSchema.parse({
      tenantGlobalId: "tenant_123",
      productKey: "labs",
      conversationId: "conv_123",
      reason: "help.vase.ar had no answer",
    });

    expect(handoff.productKey).toBe("labs");
  });

  it("validates service-to-service tokens", () => {
    expect(() => assertServiceToken("Bearer secret", "secret")).not.toThrow();
    expect(() => assertServiceToken("Bearer wrong", "secret")).toThrow("FORBIDDEN");
  });

  it("creates internal admin health payloads for V3 services", () => {
    const payload = createInternalAdminHealthPayload({
      service: vaseServiceKeySchema.parse("vase-business"),
      domain: "business.vase.ar",
    });

    expect(payload.service).toBe("vase-business");
    expect(payload.status).toBe("ok");
  });

  it("validates Vase Labs plan, channel and token pack enums", () => {
    expect(labsPlanSchema.options).toEqual(["STARTER", "GROWTH", "PRO"]);
    expect(labsChannelSchema.options).toEqual(["WHATSAPP", "INSTAGRAM", "FACEBOOK"]);
    expect(tokenPackSchema.options).toEqual(["BASIC", "MEDIUM", "PRO"]);
    expect(labsChannelProviderSchema.options).toEqual(["META_OFFICIAL", "OPENWA_UNOFFICIAL", "BAILEYS_UNOFFICIAL"]);
    expect(channelConnectionStatusSchema.options).toContain("CONNECTED");
  });

  it("creates Labs entitlements from plan defaults", () => {
    const entitlement = createLabsEntitlement({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
    });

    expect(labsEntitlementSchema.parse(entitlement)).toMatchObject({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      monthlyTokenLimit: 250000,
      monthlyTokenUsed: 0,
      tokenPackBalance: 0,
    });
    expect(entitlement.enabledChannels).toEqual(["WHATSAPP", "INSTAGRAM"]);
  });

  it("checks Labs channel access from entitlement status and enabled channels", () => {
    const entitlement = createLabsEntitlement({
      globalTenantId: "tenant_123",
      plan: "STARTER",
      status: "TRIAL",
    });

    expect(canUseLabsChannel(entitlement, "WHATSAPP")).toBe(true);
    expect(canUseLabsChannel(entitlement, "INSTAGRAM")).toBe(false);
    expect(canUseLabsChannel({ ...entitlement, status: "SUSPENDED" }, "WHATSAPP")).toBe(false);
  });

  it("defines Labs plan token limits and token pack amounts", () => {
    expect(getLabsPlanLimits("STARTER")).toMatchObject({
      monthlyTokenLimit: 50000,
      includedChannels: ["WHATSAPP"],
    });
    expect(getLabsPlanLimits("GROWTH").includedChannels).toEqual(["WHATSAPP", "INSTAGRAM"]);
    expect(getLabsPlanLimits("PRO").monthlyTokenLimit).toBe(1000000);
    expect(getTokenPackTokens("BASIC")).toBe(100000);
    expect(getTokenPackTokens("MEDIUM")).toBe(500000);
    expect(getTokenPackTokens("PRO")).toBe(1500000);
  });

  it("validates Labs admin tenant control payloads", () => {
    const control = labsAdminTenantControlSchema.parse({
      globalTenantId: "tenant_123",
      companyName: "Norte Equipos",
      labsActive: true,
      plan: "PRO",
      enabledChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
      tokenPack: "MEDIUM",
      tokensIncluded: 1000000,
      tokensUsed: 140000,
      extraTokens: 500000,
      serviceStatus: "ACTIVE",
      manualOverride: false,
    });

    expect(control.plan).toBe("PRO");
    expect(control.enabledChannels).toContain("FACEBOOK");
  });

  it("estimates messages from token packs using the shared average", () => {
    expect(estimateMessagesFromTokens(1000)).toBe(2);
    expect(estimateMessagesFromTokenPack("BASIC")).toBe(200);
    expect(estimateMessagesFromTokenPack("MEDIUM")).toBe(1000);
    expect(estimateMessagesFromTokenPack("PRO")).toBe(3000);
  });

  it("calculates the remaining Labs token balance without going negative", () => {
    const entitlement = createLabsEntitlement({
      globalTenantId: "tenant_123",
      plan: "STARTER",
      status: "ACTIVE",
      monthlyTokenUsed: 49000,
      tokenPackBalance: 5000,
    });

    expect(getLabsTokenBalance(entitlement)).toBe(6000);
    expect(getLabsTokenBalance({ ...entitlement, monthlyTokenUsed: 999999 })).toBe(0);
  });

  it("creates token usage records with computed total tokens", () => {
    const usage = createTokenUsage({
      globalTenantId: "tenant_123",
      channel: "INSTAGRAM",
      inputTokens: 120,
      outputTokens: 380,
      conversationId: "conv_123",
      messageId: "msg_123",
      assistantId: "assistant_123",
      occurredAt: "2026-06-24T10:00:00.000Z",
    });

    expect(tokenUsageSchema.parse(usage)).toMatchObject({
      globalTenantId: "tenant_123",
      channel: "INSTAGRAM",
      inputTokens: 120,
      outputTokens: 380,
      totalTokens: 500,
      conversationId: "conv_123",
      messageId: "msg_123",
      assistantId: "assistant_123",
    });
  });

  it("validates normalized WhatsApp channel contracts", () => {
    const entitlement = createLabsEntitlement({
      globalTenantId: "tenant_123",
      plan: "STARTER",
      status: "ACTIVE",
    });
    const outbound = outboundChannelMessageSchema.parse({
      to: "5491122334455",
      text: "Hola, soy Vase Labs.",
    });
    const providerConfig = whatsappProviderConfigSchema.parse({
      provider: "META_OFFICIAL",
      accessToken: "token",
      phoneNumberId: "phone_123",
      appSecret: "secret",
    });

    expect(outbound.to).toBe("5491122334455");
    expect(providerConfig.provider).toBe("META_OFFICIAL");
    expect(canUseInboundChannelMessage(entitlement, {
      globalTenantId: "tenant_123",
      channelType: "WHATSAPP",
      externalThreadKey: "5491122334455",
      messageType: "text",
      text: "Hola",
    })).toBe(true);
  });
});

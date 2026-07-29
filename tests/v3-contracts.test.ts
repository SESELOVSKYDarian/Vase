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
  getEffectiveLabsEntitlement,
  labsCatalogSyncSchema,
  getTokenPackTokens,
  labsAdminTenantControlSchema,
  labsChannelSchema,
  labsChannelProviderSchema,
  labsEntitlementSchema,
  labsPlanSchema,
  managementIntegrationProviderSchema,
  managementPricePublicationSchema,
  managementSsoClaimsSchema,
  managementSyncEventSchema,
  outboundChannelMessageSchema,
  getRestPlanLimits,
  REST_PLAN_LIMITS,
  restEdgeEnrollmentSchema,
  restEntitlementSchema,
  restHealthSchema,
  restPlanLimitsSchema,
  restPlanSchema,
  restServiceStatusSchema,
  restSessionContextSchema,
  restSyncEventSchema,
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
      tenantName: "Norte Equipos",
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
    expect(getTokenPackTokens("BASIC")).toBe(500000);
    expect(getTokenPackTokens("MEDIUM")).toBe(1200000);
    expect(getTokenPackTokens("PRO")).toBe(3000000);
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
    expect(estimateMessagesFromTokenPack("BASIC")).toBe(1000);
    expect(estimateMessagesFromTokenPack("MEDIUM")).toBe(2400);
    expect(estimateMessagesFromTokenPack("PRO")).toBe(6000);
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

  it("derives per-channel plan limits and applies audited overrides without changing the paid plan", () => {
    const effective = getEffectiveLabsEntitlement({
      paidPlan: "STARTER",
      override: {
        channelLimits: { WHATSAPP: 2, INSTAGRAM: 1, FACEBOOK: 0 },
        reason: "Ampliacion comercial aprobada",
        updatedBy: "admin_123",
        updatedAt: "2026-07-16T12:00:00.000Z",
      },
    });

    expect(effective.paidPlan).toBe("STARTER");
    expect(effective.channelLimits).toEqual({ WHATSAPP: 2, INSTAGRAM: 1, FACEBOOK: 0 });
    expect(effective.enabledChannels).toEqual(["WHATSAPP", "INSTAGRAM"]);
    expect(effective.manualOverride).toBe(true);
  });

  it("validates idempotent Business catalog sync batches", () => {
    const batch = labsCatalogSyncSchema.parse({
      eventId: "catalog_evt_123",
      globalTenantId: "tenant_123",
      occurredAt: "2026-07-16T12:00:00.000Z",
      products: [{
        externalProductId: "erp_42",
        sku: "SKU-42",
        name: "Producto demo",
        description: "Descripcion",
        price: 12500,
        stock: 8,
        imageUrl: "https://cdn.vase.ar/product.jpg",
        categories: ["Destacados"],
        active: true,
        sourceUpdatedAt: "2026-07-16T11:59:00.000Z",
      }],
    });

    expect(batch.products[0].externalProductId).toBe("erp_42");
    expect(batch.products[0].stock).toBe(8);
  });

  it("defines Management as an exclusive integration provider with publishable setup and monthly pricing", () => {
    expect(managementIntegrationProviderSchema.options).toEqual(["EXTERNAL_API", "VASE_MANAGEMENT"]);
    const pricing = managementPricePublicationSchema.parse({
      version: 3,
      currency: "ARS",
      setupPrice: 350000,
      monthlyPrice: 95000,
      status: "PUBLISHED",
      publishedAt: "2026-07-16T12:00:00.000Z",
    });
    expect(pricing.monthlyPrice).toBe(95000);
  });

  it("validates short-lived Management SSO identity claims", () => {
    const claims = managementSsoClaimsSchema.parse({
      nonce: "nonce_123",
      globalTenantId: "tenant_123",
      tenantName: "Norte Equipos",
      globalUserId: "user_123",
      email: "owner@example.com",
      name: "Owner",
      role: "OWNER",
      issuedAt: 1784203200,
      expiresAt: 1784203260,
    });
    expect(claims.expiresAt - claims.issuedAt).toBe(60);
  });

  it("validates versioned bidirectional Management sync events", () => {
    const event = managementSyncEventSchema.parse({
      eventId: "evt_123",
      globalTenantId: "tenant_123",
      entity: "PRODUCT",
      action: "UPSERT",
      externalId: "product_123",
      version: 4,
      occurredAt: "2026-07-16T12:00:00.000Z",
      payload: { name: "Producto", price: 1200, stock: 8 },
    });
    expect(event.entity).toBe("PRODUCT");
  });

  it("defines Rest plans with capacity-only defaults and explicit Enterprise limits", () => {
    expect(restPlanSchema.options).toEqual(["STARTER", "GROWTH", "PRO", "ENTERPRISE"]);
    expect(REST_PLAN_LIMITS).toEqual({
      STARTER: { branches: 1, localEmployees: 15, devices: 5, edgeInstallations: 1 },
      GROWTH: { branches: 3, localEmployees: 60, devices: 20, edgeInstallations: 3 },
      PRO: { branches: 10, localEmployees: 250, devices: 75, edgeInstallations: 10 },
    });
    expect(() => getRestPlanLimits("ENTERPRISE")).toThrow("Enterprise Rest limits must be explicit");
    expect(getRestPlanLimits("ENTERPRISE", {
      branches: 40,
      localEmployees: 1200,
      devices: 300,
      edgeInstallations: 40,
    })).toMatchObject({ branches: 40, localEmployees: 1200 });
  });

  it("validates Rest entitlements and owner/staff session contexts", () => {
    const limits = getRestPlanLimits("GROWTH");
    const entitlement = restEntitlementSchema.parse({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      limits,
      contractVersion: 4,
    });
    const session = restSessionContextSchema.parse({
      globalTenantId: "tenant_123",
      tenantSlug: "norte-equipos",
      tenantName: "Norte Equipos",
      actor: {
        kind: "LOCAL_STAFF",
        id: "employee_123",
        displayName: "Cami",
      },
      branchId: "branch_123",
      branchRoles: [{
        branchId: "branch_123",
        role: "WAITER",
        capabilities: ["ORDER_CREATE", "TABLE_MANAGE"],
      }],
      deviceId: "device_123",
      entitlement,
    });

    expect(restPlanLimitsSchema.parse(limits).devices).toBe(20);
    expect(session.actor.kind).toBe("LOCAL_STAFF");
    expect(session.branchRoles[0].role).toBe("WAITER");
  });

  it("validates Rest Edge enrollment, sync, service status, and health contracts", () => {
    const enrollment = restEdgeEnrollmentSchema.parse({
      enrollmentId: "enroll_123",
      globalTenantId: "tenant_123",
      branchId: "branch_123",
      installationId: "edge_123",
      certificateThumbprint: "A1B2C3D4",
      status: "ACTIVE",
      enrolledAt: "2026-07-28T12:00:00.000Z",
    });
    const event = restSyncEventSchema.parse({
      eventId: "evt_123",
      globalTenantId: "tenant_123",
      branchId: "branch_123",
      installationId: "edge_123",
      actorId: "employee_123",
      deviceId: "device_123",
      aggregateType: "ORDER",
      aggregateId: "order_123",
      aggregateVersion: 2,
      eventType: "ORDER_ITEM_ADDED",
      idempotencyKey: "device_123:order_123:2",
      occurredAt: "2026-07-28T12:01:00.000Z",
      payload: { itemId: "item_123", quantity: 2 },
    });
    const health = restHealthSchema.parse({
      service: "vase-rest",
      status: "ok",
      timestamp: "2026-07-28T12:02:00.000Z",
      checks: {
        database: "ok",
        eventLag: "ok",
        edgeHeartbeat: "degraded",
      },
    });

    expect(restServiceStatusSchema.parse("PAUSED")).toBe("PAUSED");
    expect(enrollment.branchId).toBe(event.branchId);
    expect(health.checks.edgeHeartbeat).toBe("degraded");
  });
});

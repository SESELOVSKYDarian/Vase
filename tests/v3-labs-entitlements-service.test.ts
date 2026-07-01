import { describe, expect, it } from "vitest";
import {
  createLabsEntitlementsService,
  type LabsEntitlementRecord,
  type LabsEntitlementsRepository,
} from "../apps/vase-labs/app/lib/labs-entitlements-service";

function createMemoryRepository(seed: LabsEntitlementRecord[] = []): LabsEntitlementsRepository {
  const records = new Map(seed.map((record) => [record.globalTenantId, { ...record }]));

  return {
    async findByGlobalTenantId(globalTenantId) {
      return records.get(globalTenantId) ?? null;
    },
    async upsert(input) {
      const current = records.get(input.globalTenantId);
      const next = {
        id: current?.id ?? `ent_${input.globalTenantId}`,
        createdAt: current?.createdAt ?? new Date("2026-06-24T00:00:00.000Z"),
        updatedAt: new Date("2026-06-25T00:00:00.000Z"),
        tokensUsed: input.tokensUsed ?? current?.tokensUsed ?? 0,
        extraTokens: current?.extraTokens ?? 0,
        currentPeriodStart: current?.currentPeriodStart ?? null,
        renewsAt: current?.renewsAt ?? null,
        tokenPack: current?.tokenPack ?? null,
        ...input,
      };
      if (input.tokensUsed === undefined) {
        next.tokensUsed = current?.tokensUsed ?? 0;
      }
      records.set(input.globalTenantId, next);
      return next;
    },
    async registerUsage(globalTenantId, usage) {
      const current = records.get(globalTenantId);
      if (!current) {
        throw new Error("LABS_ENTITLEMENT_NOT_FOUND");
      }
      const next = { ...current, tokensUsed: current.tokensUsed + usage.totalTokens };
      records.set(globalTenantId, next);
      return {
        entitlement: next,
        usage: {
          id: "usage_123",
          globalTenantId,
          ...usage,
          createdAt: new Date("2026-06-25T12:00:00.000Z"),
        },
      };
    },
  };
}

describe("Vase Labs entitlements service", () => {
  it("upserts a DB-backed runtime entitlement from App/Admin sync payloads", async () => {
    const service = createLabsEntitlementsService(createMemoryRepository());

    const entitlement = await service.upsertEntitlement({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      tokenPack: "BASIC",
      tokensIncluded: 250000,
      extraTokens: 500000,
      currentPeriodStart: "2026-06-24T00:00:00.000Z",
      renewsAt: "2026-07-24T00:00:00.000Z",
    });

    expect(entitlement).toMatchObject({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      tokenPack: "BASIC",
      tokensIncluded: 250000,
      tokensUsed: 0,
      extraTokens: 500000,
      currentPeriodStart: "2026-06-24T00:00:00.000Z",
      renewsAt: "2026-07-24T00:00:00.000Z",
    });
  });

  it("registers token usage and increments the persisted entitlement balance", async () => {
    const service = createLabsEntitlementsService(createMemoryRepository([
      {
        id: "ent_123",
        globalTenantId: "tenant_123",
        plan: "PRO",
        status: "ACTIVE",
        enabledChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
        tokenPack: null,
        tokensIncluded: 1000000,
        tokensUsed: 1000,
        extraTokens: 0,
        currentPeriodStart: null,
        renewsAt: null,
        createdAt: new Date("2026-06-24T00:00:00.000Z"),
        updatedAt: new Date("2026-06-24T00:00:00.000Z"),
      },
    ]));

    const result = await service.registerTokenUsage("tenant_123", {
      channel: "FACEBOOK",
      inputTokens: 100,
      outputTokens: 250,
      conversationId: "conv_123",
      messageId: "msg_123",
      assistantId: "assistant_123",
    });

    expect(result.usage.totalTokens).toBe(350);
    expect(result.entitlement.tokensUsed).toBe(1350);
    expect(result.remainingTokens).toBe(998650);
  });

  it("preserves existing usage when sync payload omits tokensUsed", async () => {
    const service = createLabsEntitlementsService(createMemoryRepository([
      {
        id: "ent_123",
        globalTenantId: "tenant_123",
        plan: "STARTER",
        status: "ACTIVE",
        enabledChannels: ["WHATSAPP"],
        tokenPack: null,
        tokensIncluded: 50000,
        tokensUsed: 1200,
        extraTokens: 0,
        currentPeriodStart: null,
        renewsAt: null,
        createdAt: new Date("2026-06-24T00:00:00.000Z"),
        updatedAt: new Date("2026-06-24T00:00:00.000Z"),
      },
    ]));

    const entitlement = await service.upsertEntitlement({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP", "INSTAGRAM"],
      tokenPack: "BASIC",
      tokensIncluded: 250000,
      extraTokens: 500000,
    });

    expect(entitlement.plan).toBe("GROWTH");
    expect(entitlement.tokensUsed).toBe(1200);
  });
});

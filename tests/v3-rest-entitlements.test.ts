import { describe, expect, it } from "vitest";
import {
  createRestEntitlementService,
  type RestEntitlementRepository,
  type RestPricingRecord,
} from "../apps/vase-app/src/server/services/rest-entitlements";

function repositoryFixture() {
  const pricing = new Map<string, RestPricingRecord>();
  const contracts = new Map<string, unknown>();
  let sequence = 0;

  const repository: RestEntitlementRepository = {
    async nextVersion(plan) {
      return [...pricing.values()].filter((record) => record.plan === plan).length + 1;
    },
    async createPricingVersion(input) {
      sequence += 1;
      const record = { id: `price_${sequence}`, ...input };
      pricing.set(record.id, record);
      return record;
    },
    async findPricingVersion(id) {
      return pricing.get(id) ?? null;
    },
    async publishPricingVersion(id, publishedAt) {
      const current = pricing.get(id);
      if (!current) return null;
      const published = { ...current, status: "PUBLISHED" as const, publishedAt };
      pricing.set(id, published);
      return published;
    },
    async upsertTenantContract(input) {
      contracts.set(input.globalTenantId, input);
      return input;
    },
  };

  return { repository, pricing, contracts };
}

describe("Vase Rest entitlements", () => {
  it("creates complete versions, publishes once, and preserves the accepted version", async () => {
    const fixture = repositoryFixture();
    const service = createRestEntitlementService(fixture.repository);
    const draft = await service.createDraft({
      plan: "GROWTH",
      currency: "ARS",
      monthlyPrice: 185000,
      limits: { branches: 3, localEmployees: 60, devices: 20, edgeInstallations: 3 },
      effectiveAt: "2026-08-01T00:00:00.000Z",
      createdById: "admin_123",
    });
    const published = await service.publish(draft.id, new Date("2026-07-28T15:00:00.000Z"));
    const contract = await service.acceptForTenant({
      globalTenantId: "tenant_123",
      pricingVersionId: published.id,
    });

    expect(published.status).toBe("PUBLISHED");
    expect(contract).toMatchObject({
      globalTenantId: "tenant_123",
      pricingVersionId: published.id,
      plan: "GROWTH",
      status: "ACTIVE",
      limits: { branches: 3, localEmployees: 60, devices: 20, edgeInstallations: 3 },
    });
    await expect(service.publish(draft.id)).rejects.toThrow("REST_PRICING_ALREADY_PUBLISHED");
  });

  it("rejects incomplete or invalid commercial versions", async () => {
    const service = createRestEntitlementService(repositoryFixture().repository);

    await expect(service.createDraft({
      plan: "STARTER",
      currency: "ARS",
      monthlyPrice: -1,
      limits: { branches: 1, localEmployees: 15, devices: 5, edgeInstallations: 1 },
      effectiveAt: "2026-08-01T00:00:00.000Z",
      createdById: "admin_123",
    })).rejects.toThrow();
  });
});

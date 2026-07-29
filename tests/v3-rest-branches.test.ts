import { describe, expect, it } from "vitest";
import {
  createBranchService,
  type BranchRecord,
} from "../apps/vase-rest/app/lib/branches/branch-service";

function fixture(limit = 3) {
  const rows: BranchRecord[] = [];
  const service = createBranchService({
    countActive: async (tenantId) => rows.filter((row) =>
      row.globalTenantId === tenantId && row.active).length,
    list: async (tenantId) => rows.filter((row) => row.globalTenantId === tenantId),
    findByCodeOrSlug: async (tenantId, code, slug) => rows.find((row) =>
      row.globalTenantId === tenantId && (row.code === code || row.slug === slug)) ?? null,
    create: async (input) => {
      const row = { id: `branch_${rows.length + 1}`, active: true, ...input };
      rows.push(row);
      return row;
    },
    update: async (tenantId, id, input) => {
      const row = rows.find((candidate) =>
        candidate.globalTenantId === tenantId && candidate.id === id);
      if (!row) return null;
      Object.assign(row, input);
      return row;
    },
  });
  const context = {
    globalTenantId: "tenant_1",
    status: "ACTIVE",
    branchLimit: limit,
  };
  return { rows, service, context };
}

describe("Rest branches", () => {
  it("creates, lists and updates only inside the active tenant", async () => {
    const { service, context } = fixture();
    const created = await service.create(context, {
      code: "PAL",
      slug: "palermo",
      name: "Palermo",
      timezone: "America/Argentina/Buenos_Aires",
    });
    await service.create({ ...context, globalTenantId: "tenant_2" }, {
      code: "CTR",
      slug: "centro",
      name: "Centro",
    });

    expect(await service.list(context)).toEqual([created]);
    await expect(service.update(context, created.id, { name: "Palermo Soho" }))
      .resolves.toMatchObject({ name: "Palermo Soho" });
    await expect(service.update(
      { ...context, globalTenantId: "tenant_2" },
      created.id,
      { name: "Ataque" },
    )).rejects.toThrow("REST_BRANCH_NOT_FOUND");
  });

  it("enforces code/slug uniqueness and plan capacity per tenant", async () => {
    const { service, context } = fixture(1);
    await service.create(context, { code: "PAL", slug: "palermo", name: "Palermo" });
    await expect(service.create(context, {
      code: "PAL",
      slug: "otra",
      name: "Otra",
    })).rejects.toThrow("REST_BRANCH_DUPLICATE");
    await expect(service.create(context, {
      code: "NTE",
      slug: "norte",
      name: "Norte",
    })).rejects.toThrow("REST_BRANCH_LIMIT_REACHED");
  });

  it("blocks mutations for inactive entitlements and supports deactivation", async () => {
    const { service, context } = fixture();
    await expect(service.create(
      { ...context, status: "SUSPENDED" },
      { code: "PAL", slug: "palermo", name: "Palermo" },
    )).rejects.toThrow("REST_CONTRACT_INACTIVE");

    const branch = await service.create(context, {
      code: "PAL",
      slug: "palermo",
      name: "Palermo",
    });
    await expect(service.update(context, branch.id, { active: false }))
      .resolves.toMatchObject({ active: false });
  });
});

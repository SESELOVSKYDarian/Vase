/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  clientProductAccessSchema,
  parseStoredClientProductAccess,
  projectClientProductAccessToLegacy,
} from "@/lib/admin/client-product-access";
import {
  adaptLegacyClientProductAccessWithTx,
  applyClientProductAccess,
} from "@/server/services/client-product-access";
import { resolveLabsCommercialStatus } from "@/server/services/labs-entitlement-state";

type Row = Record<string, any>;

const modules = [
  { id: "vase_business", product: "BUSINESS", isActive: true },
  { id: "vase_labs", product: "LABS", isActive: true },
  { id: "vase_management", product: "MANAGEMENT", isActive: true },
  { id: "vase_rest", product: "REST", isActive: true },
];

const submodules = [
  { id: "business-template", moduleId: "vase_business", key: "plantilla", isActive: true },
  { id: "business-custom", moduleId: "vase_business", key: "personalizado", isActive: true },
  { id: "labs-starter", moduleId: "vase_labs", key: "starter", isActive: true },
  { id: "labs-pro", moduleId: "vase_labs", key: "pro", isActive: true },
  { id: "labs-growth", moduleId: "vase_labs", key: "growth", isActive: true },
  { id: "business-future", moduleId: "vase_business", key: "future", isActive: true },
];

const features = [
  { id: "business-enabled", moduleId: "vase_business", submoduleId: null, valueType: "BOOLEAN", minValue: null, maxValue: null, isActive: true },
  { id: "template-pages", moduleId: "vase_business", submoduleId: "business-template", valueType: "INTEGER", minValue: 1, maxValue: 10, isActive: true },
  { id: "custom-label", moduleId: "vase_business", submoduleId: "business-custom", valueType: "TEXT", minValue: null, maxValue: null, isActive: true },
  { id: "labs-feature", moduleId: "vase_labs", submoduleId: "labs-pro", valueType: "BOOLEAN", minValue: null, maxValue: null, isActive: true },
  { id: "future-business-feature", moduleId: "vase_business", submoduleId: "business-future", valueType: "BOOLEAN", minValue: null, maxValue: null, isActive: true },
];

function matchesIn(value: unknown, filter: any) {
  return !filter?.in || filter.in.includes(value);
}

function createStatefulTx(seed: {
  existingTenant?: boolean;
  restPublished?: boolean;
  failRestWrite?: boolean;
  racePrimaryOwnerUpsert?: "same-owner" | "unresolved";
} = {}) {
  const state = {
    tenants: seed.existingTenant === false ? [] as Row[] : [{ id: "tenant-1", name: "Old", status: "TRIAL", slug: "old", primaryOwnerUserId: "owner-1" }],
    memberships: seed.existingTenant === false ? [] as Row[] : [{ id: "membership-1", userId: "owner-1", tenantId: "tenant-1", role: "OWNER", status: "SUSPENDED", createdByUserId: "original-actor", createdAt: new Date("2025-01-01") }],
    tenantModules: [] as Row[],
    tenantSubmodules: [] as Row[],
    grants: [
      { tenantId: "tenant-1", featureId: "labs-feature", enabled: true, value: true },
      { tenantId: "tenant-1", featureId: "future-business-feature", enabled: true, value: true },
      { tenantId: "tenant-1", featureId: "business-enabled", enabled: true, value: true },
      { tenantId: "tenant-1", featureId: "custom-label", enabled: true, value: "Preserve me" },
    ] as Row[],
    workspaces: [] as Row[],
    contracts: [] as Row[],
    userAccess: [{ userId: "owner-1", moduleId: "future_module", isActive: true }] as Row[],
    writes: 0,
    slugLookups: 0,
    membershipOrderBy: null as unknown,
    ownerLocks: [] as string[],
  };

  const findLink = (rows: Row[], tenantId: string, key: string, value: string) => rows.find((row) => row.tenantId === tenantId && row[key] === value);
  const upsertLink = (rows: Row[], args: any, key: string) => {
    state.writes++;
    const unique = args.where[`tenantId_${key}`];
    const current = findLink(rows, unique.tenantId, key, unique[key]);
    if (current) return Object.assign(current, args.update);
    const created = { id: `${key}-${rows.length + 1}`, ...args.create };
    rows.push(created);
    return created;
  };

  const tx: any = {
    $queryRaw: async (query: { strings?: string[]; values?: unknown[] }) => {
      state.ownerLocks.push(query.strings?.join("?") ?? String(query));
      return [{ id: String(query.values?.[0] ?? baseInput.ownerUserId) }];
    },
    module: {
      findMany: async () => modules.map((row) => ({ ...row })),
    },
    moduleSubmodule: {
      findMany: async () => submodules.map((row) => ({ ...row })),
    },
    moduleFeature: {
      findMany: async ({ where }: any) => features.filter((row) => row.moduleId === where.moduleId).map((row) => ({ ...row })),
    },
    restPricingVersion: {
      findFirst: async ({ where }: any) => where.id === "rest-published" && seed.restPublished !== false
        ? { id: "rest-published", plan: "PRO", version: 7, currency: "ARS", monthlyPrice: 12500, branchLimit: 4, localEmployeeLimit: 25, deviceLimit: 8, edgeLimit: 2, status: "PUBLISHED" }
        : null,
      findMany: async () => [{ id: "starter-published" }],
    },
    tenant: {
      findUnique: async ({ where }: any) => {
        if (where.slug) state.slugLookups++;
        return state.tenants.find((tenant) =>
          (where.slug && tenant.slug === where.slug) ||
          (where.id && tenant.id === where.id) ||
          (where.primaryOwnerUserId && tenant.primaryOwnerUserId === where.primaryOwnerUserId)) ?? null;
      },
      create: async ({ data }: any) => {
        state.writes++;
        const row = { id: "tenant-created", ...data };
        state.tenants.push(row);
        return row;
      },
      upsert: async ({ where, update, create }: any) => {
        state.writes++;
        const current = state.tenants.find((tenant) => tenant.primaryOwnerUserId === where.primaryOwnerUserId);
        if (current) return Object.assign(current, update);
        if (seed.racePrimaryOwnerUpsert) {
          if (seed.racePrimaryOwnerUpsert === "same-owner") {
            state.tenants.push({ id: "tenant-race-winner", ...create });
          }
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "6.6.0",
            meta: { target: ["primaryOwnerUserId"] },
          });
        }
        const row = { id: "tenant-created", ...create };
        state.tenants.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        state.writes++;
        return Object.assign(state.tenants.find((tenant) => tenant.id === where.id)!, data);
      },
      updateMany: async ({ where, data }: any) => {
        state.writes++;
        const rows = state.tenants.filter((tenant) =>
          tenant.id === where.id &&
          (where.primaryOwnerUserId === undefined || tenant.primaryOwnerUserId === where.primaryOwnerUserId));
        rows.forEach((tenant) => Object.assign(tenant, data));
        return { count: rows.length };
      },
    },
    membership: {
      findFirst: async ({ where, orderBy }: any) => {
        state.membershipOrderBy = orderBy;
        return state.memberships.find((membership) => membership.userId === where.userId) ?? null;
      },
      findMany: async ({ where, take }: any) => state.memberships
        .filter((membership) =>
          (!where.userId || membership.userId === where.userId) &&
          (!where.tenantId || membership.tenantId === where.tenantId) &&
          (!where.role || membership.role === where.role))
        .slice(0, take),
      count: async ({ where }: any) => state.memberships.filter((membership) =>
        (!where.userId || membership.userId === where.userId) &&
        (!where.tenantId || membership.tenantId === where.tenantId) &&
        (!where.role || membership.role === where.role)).length,
      upsert: async ({ where, update, create }: any) => {
        state.writes++;
        const key = where.userId_tenantId;
        const current = state.memberships.find((membership) => membership.userId === key.userId && membership.tenantId === key.tenantId);
        if (current) return Object.assign(current, update);
        const row = { id: `membership-${state.memberships.length + 1}`, ...create };
        state.memberships.push(row);
        return row;
      },
    },
    tenantModule: {
      findUnique: async ({ where }: any) => {
        const key = where.tenantId_moduleId;
        return findLink(state.tenantModules, key.tenantId, "moduleId", key.moduleId) ?? null;
      },
      findMany: async ({ where }: any) => state.tenantModules.filter((row) => row.tenantId === where.tenantId && matchesIn(row.moduleId, where.moduleId)),
      updateMany: async ({ where, data }: any) => {
        state.writes++;
        const excluded = where.NOT?.moduleId?.in ?? [];
        for (const row of state.tenantModules) if (row.tenantId === where.tenantId && matchesIn(row.moduleId, where.moduleId) && !excluded.includes(row.moduleId)) Object.assign(row, data);
        return { count: 1 };
      },
      upsert: async (args: any) => upsertLink(state.tenantModules, args, "moduleId"),
    },
    tenantSubmodule: {
      findMany: async ({ where }: any) => state.tenantSubmodules.filter((row) => row.tenantId === where.tenantId && matchesIn(row.submoduleId, where.submoduleId)),
      updateMany: async ({ where, data }: any) => {
        state.writes++;
        const excluded = where.NOT?.submoduleId?.in ?? [];
        for (const row of state.tenantSubmodules) if (row.tenantId === where.tenantId && matchesIn(row.submoduleId, where.submoduleId) && !excluded.includes(row.submoduleId)) Object.assign(row, data);
        return { count: 1 };
      },
      upsert: async (args: any) => upsertLink(state.tenantSubmodules, args, "submoduleId"),
    },
    tenantFeatureGrant: {
      deleteMany: async ({ where }: any) => {
        state.writes++;
        state.grants = state.grants.filter((row) => row.tenantId !== where.tenantId || !where.featureId.in.includes(row.featureId));
        return { count: 1 };
      },
      upsert: async ({ where, update, create }: any) => {
        state.writes++;
        const key = where.tenantId_featureId;
        const current = state.grants.find((row) => row.tenantId === key.tenantId && row.featureId === key.featureId);
        if (current) return Object.assign(current, update);
        state.grants.push({ ...create });
        return create;
      },
    },
    tenantAiWorkspace: {
      upsert: async ({ where, update, create }: any) => {
        state.writes++;
        const current = state.workspaces.find((row) => row.tenantId === where.tenantId);
        if (current) return Object.assign(current, update);
        const row = { id: "workspace-1", ...create };
        state.workspaces.push(row);
        return row;
      },
    },
    tenantRestContract: {
      findUnique: async ({ where }: any) => state.contracts.find((row) => row.tenantId === where.tenantId) ?? null,
      upsert: async ({ where, update, create }: any) => {
        if (seed.failRestWrite) throw new Error("SIMULATED_REST_FAILURE");
        state.writes++;
        const current = state.contracts.find((row) => row.tenantId === where.tenantId);
        if (current) return Object.assign(current, update);
        state.contracts.push({ id: "contract-1", ...create });
        return create;
      },
      updateMany: async ({ where, data }: any) => {
        state.writes++;
        for (const row of state.contracts) if (row.tenantId === where.tenantId) Object.assign(row, data);
        return { count: 1 };
      },
    },
    userModuleAccess: {
      updateMany: async ({ where, data }: any) => {
        state.writes++;
        const excluded = where.NOT?.moduleId?.in ?? [];
        for (const row of state.userAccess) if (row.userId === where.userId && matchesIn(row.moduleId, where.moduleId) && !excluded.includes(row.moduleId)) Object.assign(row, data);
        return { count: 1 };
      },
      upsert: async ({ where, update, create }: any) => {
        state.writes++;
        const key = where.userId_moduleId;
        const current = state.userAccess.find((row) => row.userId === key.userId && row.moduleId === key.moduleId);
        if (current) return Object.assign(current, update);
        state.userAccess.push({ ...create });
        return create;
      },
    },
  };

  const transaction = async <T>(callback: (client: typeof tx) => Promise<T>) => {
    const snapshot = structuredClone(state);
    try {
      return await callback(tx);
    } catch (error) {
      Object.assign(state, snapshot);
      throw error;
    }
  };

  return { tx, state, transaction };
}

const baseInput = {
  actorUserId: "admin-1",
  ownerUserId: "owner-1",
  ownerName: "Acme Owner",
  ownerEmail: "owner@acme.test",
  now: new Date("2026-08-04T12:00:00.000Z"),
};

describe("applyClientProductAccess", () => {
  it("reactivates the primary owner's membership while preserving its creator", async () => {
    const { tx, state } = createStatefulTx();
    await applyClientProductAccess({ ...baseInput, tx, access: { business: null, labs: null, rest: null, management: { status: "ACTIVE" } } });

    expect(state.tenants[0]).toMatchObject({ name: "Acme Owner", accountName: "Acme Owner", billingEmail: "owner@acme.test", status: "ACTIVE" });
    expect(state.memberships[0]).toMatchObject({ role: "OWNER", status: "ACTIVE", createdByUserId: "original-actor" });
  });

  it("creates a tenant from owner identity and records the actor as membership creator", async () => {
    const { tx, state } = createStatefulTx({ existingTenant: false });
    await applyClientProductAccess({ ...baseInput, tx, tenantSlugSeed: "ACME !!", access: { business: null, labs: null, rest: null, management: null } });

    expect(state.tenants[0]).toMatchObject({ slug: "acme-owner-1", industry: "General", status: "ACTIVE", primaryOwnerUserId: "owner-1" });
    expect(state.slugLookups).toBe(0);
    expect(state.memberships[0]).toMatchObject({ role: "OWNER", status: "ACTIVE", createdByUserId: "admin-1" });
  });

  it("never promotes an unrelated MEMBER membership and creates a separate primary tenant", async () => {
    const { tx, state } = createStatefulTx();
    state.tenants[0].primaryOwnerUserId = null;
    state.memberships[0].role = "MEMBER";

    const result = await applyClientProductAccess({ ...baseInput, tx, access: { business: null, labs: null, rest: null, management: null } });

    expect(result.tenantId).not.toBe("tenant-1");
    expect(state.memberships.find((membership) => membership.id === "membership-1")).toMatchObject({ role: "MEMBER" });
    expect(state.tenants.find((tenant) => tenant.id === result.tenantId)).toMatchObject({ primaryOwnerUserId: "owner-1" });
  });

  it("rejects ambiguous legacy OWNER memberships instead of choosing one", async () => {
    const { tx, state } = createStatefulTx();
    state.tenants[0].primaryOwnerUserId = null;
    state.tenants.push({ id: "tenant-2", name: "Other", slug: "other", primaryOwnerUserId: null });
    state.memberships.push({ id: "membership-2", userId: "owner-1", tenantId: "tenant-2", role: "OWNER", status: "ACTIVE", createdAt: new Date("2025-02-01") });

    await expect(applyClientProductAccess({ ...baseInput, tx, access: { business: null, labs: null, rest: null, management: null } }))
      .rejects.toThrow("CLIENT_OWNER_TENANT_AMBIGUOUS");
  });

  it("claims exactly one legacy OWNER tenant as its primary owner", async () => {
    const { tx, state } = createStatefulTx();
    state.tenants[0].primaryOwnerUserId = null;

    await applyClientProductAccess({ ...baseInput, tx, access: { business: null, labs: null, rest: null, management: null } });

    expect(state.tenants[0].primaryOwnerUserId).toBe("owner-1");
  });

  it("rejects a legacy tenant with multiple OWNERs before claiming its primary owner", async () => {
    const { tx, state } = createStatefulTx();
    state.tenants[0].primaryOwnerUserId = null;
    state.memberships.push({
      id: "membership-co-owner",
      userId: "owner-2",
      tenantId: "tenant-1",
      role: "OWNER",
      status: "ACTIVE",
      createdAt: new Date("2025-02-01"),
    });
    const writesBefore = state.writes;

    await expect(applyClientProductAccess({
      ...baseInput,
      tx,
      access: { business: null, labs: null, rest: null, management: null },
    })).rejects.toThrow("CLIENT_TENANT_OWNER_AMBIGUOUS");

    expect(state.tenants[0].primaryOwnerUserId).toBeNull();
    expect(state.writes).toBe(writesBefore);
  });

  it("returns a domain error on P2002 instead of rereading a repeatable-read snapshot", async () => {
    const { tx, state } = createStatefulTx({ existingTenant: false, racePrimaryOwnerUpsert: "same-owner" });

    await expect(applyClientProductAccess({
      ...baseInput,
      tx,
      access: { business: null, labs: null, rest: null, management: null },
    })).rejects.toThrow("CLIENT_PRIMARY_OWNER_RACE_CONFLICT");

    expect(state.memberships).toEqual([]);
  });

  it("returns a domain error when a P2002 race has no tenant for the owner key", async () => {
    const { tx } = createStatefulTx({ existingTenant: false, racePrimaryOwnerUpsert: "unresolved" });

    await expect(applyClientProductAccess({
      ...baseInput,
      tx,
      access: { business: null, labs: null, rest: null, management: null },
    })).rejects.toThrow("CLIENT_PRIMARY_OWNER_RACE_CONFLICT");
  });

  it("locks the owner User row with SELECT FOR UPDATE before tenant resolution", async () => {
    const { tx, state } = createStatefulTx();

    await applyClientProductAccess({
      ...baseInput,
      tx,
      access: { business: null, labs: null, rest: null, management: null },
    });

    expect(state.ownerLocks).toHaveLength(1);
    expect(state.ownerLocks[0]).toMatch(/SELECT\s+`?id`?\s+FROM\s+`?User`?.*FOR UPDATE/i);
  });

  it("keeps independent Business commercial states and replaces only Business grants", async () => {
    const { tx, state } = createStatefulTx();
    await applyClientProductAccess({
      ...baseInput,
      tx,
      access: {
        business: { submodules: [
          { id: "business-template", key: "plantilla", status: "TRIAL", features: [{ featureId: "template-pages", enabled: true, value: 5 }] },
          { id: "business-custom", key: "personalizado", status: "ACTIVE", features: [{ featureId: "custom-label", enabled: true, value: "Plus" }] },
        ] },
        labs: null,
        rest: null,
        management: null,
      },
    });

    expect(state.tenantSubmodules).toEqual(expect.arrayContaining([
      expect.objectContaining({ submoduleId: "business-template", commercialStatus: "TRIAL", trialEndsAt: new Date("2026-08-18T12:00:00.000Z") }),
      expect.objectContaining({ submoduleId: "business-custom", commercialStatus: "ACTIVE", trialEndsAt: null }),
    ]));
    expect(state.grants).toEqual(expect.arrayContaining([
      expect.objectContaining({ featureId: "template-pages", value: 5 }),
      expect.objectContaining({ featureId: "custom-label", value: "Plus" }),
      expect.objectContaining({ featureId: "labs-feature", value: true }),
      expect.objectContaining({ featureId: "future-business-feature", value: true }),
      expect.objectContaining({ featureId: "business-enabled", value: true }),
    ]));
  });

  it("replaces only submitted Business feature scopes and preserves grants while Business is disabled", async () => {
    const { tx, state } = createStatefulTx();
    await applyClientProductAccess({
      ...baseInput,
      tx,
      access: {
        business: { submodules: [{
          id: "business-template",
          key: "plantilla",
          status: "ACTIVE",
          features: [{ featureId: "template-pages", enabled: true, value: 3 }],
        }] },
        labs: null,
        rest: null,
        management: null,
      },
    });
    expect(state.grants).toEqual(expect.arrayContaining([
      expect.objectContaining({ featureId: "template-pages", value: 3 }),
      expect.objectContaining({ featureId: "custom-label", value: "Preserve me" }),
      expect.objectContaining({ featureId: "business-enabled", value: true }),
    ]));

    await applyClientProductAccess({ ...baseInput, tx, access: { business: null, labs: null, rest: null, management: null } });
    expect(state.grants).toEqual(expect.arrayContaining([
      expect.objectContaining({ featureId: "template-pages", value: 3 }),
      expect.objectContaining({ featureId: "custom-label", value: "Preserve me" }),
      expect.objectContaining({ featureId: "business-enabled", value: true }),
    ]));
  });

  it("updates an explicitly submitted module-wide Business override without touching omitted grants", async () => {
    const { tx, state } = createStatefulTx();
    await applyClientProductAccess({
      ...baseInput,
      tx,
      access: {
        business: { submodules: [{
          id: "business-template",
          key: "plantilla",
          status: "ACTIVE",
          features: [{ featureId: "business-enabled", enabled: false, value: false }],
        }] },
        labs: null,
        rest: null,
        management: null,
      },
    });
    expect(state.grants.find((grant) => grant.featureId === "business-enabled")).toMatchObject({ enabled: false, value: false });
    expect(state.grants.find((grant) => grant.featureId === "custom-label")).toMatchObject({ value: "Preserve me" });
  });

  it("does not mutate any Business grants in legacy PRESERVE mode", async () => {
    const { tx, state } = createStatefulTx();
    state.grants.push({ tenantId: "tenant-1", featureId: "template-pages", enabled: true, value: 9 });
    const before = structuredClone(state.grants);

    await applyClientProductAccess({
      ...baseInput,
      tx,
      businessFeatureMode: "PRESERVE",
      access: {
        business: { submodules: [{ id: "business-template", key: "plantilla", status: "ACTIVE", features: [] }] },
        labs: null,
        rest: null,
        management: null,
      },
    });
    expect(state.grants).toEqual(before);
  });

  it("rejects cross-scope features and invalid feature values before writes", async () => {
    const crossScope = createStatefulTx();
    await expect(applyClientProductAccess({
      ...baseInput,
      tx: crossScope.tx,
      access: { business: { submodules: [{ id: "business-template", key: "plantilla", status: "ACTIVE", features: [{ featureId: "labs-feature", enabled: true, value: true }] }] }, labs: null, rest: null, management: null },
    })).rejects.toThrow("CLIENT_FEATURE_SCOPE_INVALID");
    expect(crossScope.state.writes).toBe(0);

    const invalidValue = createStatefulTx();
    await expect(applyClientProductAccess({
      ...baseInput,
      tx: invalidValue.tx,
      access: { business: { submodules: [{ id: "business-template", key: "plantilla", status: "ACTIVE", features: [{ featureId: "template-pages", enabled: true, value: 11 }] }] }, labs: null, rest: null, management: null },
    })).rejects.toThrow("CLIENT_FEATURE_VALUE_INVALID");
    expect(invalidValue.state.writes).toBe(0);
  });

  it("requires exactly one matching Labs plan and syncs fixed entitlement channels", async () => {
    const invalid = createStatefulTx();
    await expect(applyClientProductAccess({ ...baseInput, tx: invalid.tx, access: { business: null, labs: { submoduleId: "labs-starter", plan: "PRO", status: "ACTIVE" }, rest: null, management: null } })).rejects.toThrow("CLIENT_LABS_PLAN_INVALID");
    expect(invalid.state.writes).toBe(0);

    const { tx, state } = createStatefulTx();
    state.workspaces.push({
      id: "workspace-1",
      tenantId: "tenant-1",
      channelLimits: { WHATSAPP: 9, INSTAGRAM: 9, FACEBOOK: 9 },
      channelOverrideReason: "A legacy manual override",
      channelOverrideBy: "admin-old",
      channelOverrideAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    await applyClientProductAccess({ ...baseInput, tx, access: { business: null, labs: { submoduleId: "labs-pro", plan: "PRO", status: "ACTIVE" }, rest: null, management: null } });
    expect(state.workspaces[0]).toMatchObject({
      entitlementPlan: "PRO",
      plan: "PREMIUM",
      monthlyConversationLimit: 2500,
      monthlyKnowledgeItemLimit: 80,
      maxFiles: 25,
      maxUrls: 20,
      maxChannels: 2,
      channelLimits: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 0 },
      channelOverrideReason: null,
      channelOverrideBy: null,
      channelOverrideAt: null,
    });
  });

  it("round-trips a provisioned Labs Trial through the consumer commercial status", async () => {
    const { tx, state } = createStatefulTx();
    await applyClientProductAccess({
      ...baseInput,
      tx,
      access: {
        business: null,
        labs: { submoduleId: "labs-pro", plan: "PRO", status: "TRIAL" },
        rest: null,
        management: null,
      },
    });

    const labsModule = state.tenantModules.find((row) => row.moduleId === "vase_labs")!;
    const submodule = state.tenantSubmodules.find((row) => row.submoduleId === "labs-pro")!;
    expect(resolveLabsCommercialStatus({
      module: { isActive: Boolean(labsModule.isActive), commercialStatus: String(labsModule.commercialStatus) },
      submodule: { isActive: Boolean(submodule.isActive), commercialStatus: String(submodule.commercialStatus) },
    })).toBe("TRIAL");
  });

  it("copies only published Rest pricing and suspends the preserved contract when Rest is removed", async () => {
    const unpublished = createStatefulTx({ restPublished: false });
    await expect(applyClientProductAccess({ ...baseInput, tx: unpublished.tx, access: { business: null, labs: null, rest: { pricingVersionId: "rest-draft", status: "ACTIVE" }, management: null } })).rejects.toThrow("REST_PRICING_NOT_PUBLISHED");
    expect(unpublished.state.writes).toBe(0);

    const { tx, state } = createStatefulTx();
    await applyClientProductAccess({ ...baseInput, tx, access: { business: null, labs: null, rest: { pricingVersionId: "rest-published", status: "TRIAL" }, management: null } });
    expect(state.contracts[0]).toMatchObject({ plan: "PRO", status: "TRIAL", agreedMonthlyPrice: 12500, currency: "ARS", branchLimit: 4, localEmployeeLimit: 25, deviceLimit: 8, edgeLimit: 2, acceptedVersion: 7, suspendedAt: null });

    await applyClientProductAccess({ ...baseInput, tx, now: new Date("2026-08-05T12:00:00.000Z"), access: { business: null, labs: null, rest: null, management: null } });
    expect(state.contracts[0]).toMatchObject({ status: "SUSPENDED", suspendedAt: new Date("2026-08-05T12:00:00.000Z") });
  });

  it("updates only managed owner module access and preserves a future module", async () => {
    const { tx, state } = createStatefulTx();
    const result = await applyClientProductAccess({ ...baseInput, tx, access: { business: null, labs: null, rest: null, management: { status: "ACTIVE" } } });

    expect(result.activeModuleIds).toEqual(["vase_management"]);
    expect(state.userAccess.find((row) => row.moduleId === "future_module")).toMatchObject({ isActive: true });
    expect(state.userAccess.find((row) => row.moduleId === "vase_management")).toMatchObject({ isActive: true });
  });

  it("preserves a future trial expiry and resets an expired trial", async () => {
    const { tx, state } = createStatefulTx();
    state.tenantModules.push({ tenantId: "tenant-1", moduleId: "vase_management", isActive: true, commercialStatus: "TRIAL", trialEndsAt: new Date("2026-09-01T00:00:00.000Z") });
    state.tenantSubmodules.push({ tenantId: "tenant-1", submoduleId: "business-template", isActive: true, commercialStatus: "TRIAL", trialEndsAt: new Date("2026-08-01T00:00:00.000Z") });

    await applyClientProductAccess({ ...baseInput, tx, access: { business: { submodules: [{ id: "business-template", key: "plantilla", status: "TRIAL", features: [] }] }, labs: null, rest: null, management: { status: "TRIAL" } } });
    expect(state.tenantModules.find((row) => row.moduleId === "vase_management")?.trialEndsAt).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    expect(state.tenantSubmodules.find((row) => row.submoduleId === "business-template")?.trialEndsAt).toEqual(new Date("2026-08-18T12:00:00.000Z"));
  });

  it("preserves activatedAt on no-op resubmission and changes it on reactivation", async () => {
    const { tx, state } = createStatefulTx();
    const originalActivation = new Date("2026-07-01T00:00:00.000Z");
    state.tenantModules.push({
      tenantId: "tenant-1",
      moduleId: "vase_management",
      isActive: true,
      commercialStatus: "ACTIVE",
      trialEndsAt: null,
      activatedAt: originalActivation,
    });

    await applyClientProductAccess({
      ...baseInput,
      tx,
      access: { business: null, labs: null, rest: null, management: { status: "ACTIVE" } },
    });
    expect(state.tenantModules[0].activatedAt).toEqual(originalActivation);

    await applyClientProductAccess({
      ...baseInput,
      tx,
      now: new Date("2026-08-05T12:00:00.000Z"),
      access: { business: null, labs: null, rest: null, management: null },
    });
    await applyClientProductAccess({
      ...baseInput,
      tx,
      now: new Date("2026-08-06T12:00:00.000Z"),
      access: { business: null, labs: null, rest: null, management: { status: "ACTIVE" } },
    });
    expect(state.tenantModules[0].activatedAt).toEqual(new Date("2026-08-06T12:00:00.000Z"));
  });

  it("preserves Rest contract and module activatedAt on an exact resubmission", async () => {
    const { tx, state } = createStatefulTx();
    const originalActivation = new Date("2026-07-01T00:00:00.000Z");
    state.tenantModules.push({
      tenantId: "tenant-1",
      moduleId: "vase_rest",
      isActive: true,
      commercialStatus: "TRIAL",
      trialEndsAt: new Date("2026-08-10T00:00:00.000Z"),
      activatedAt: originalActivation,
    });
    state.contracts.push({
      id: "contract-1",
      tenantId: "tenant-1",
      pricingVersionId: "rest-published",
      status: "TRIAL",
      activatedAt: originalActivation,
    });

    await applyClientProductAccess({
      ...baseInput,
      tx,
      access: { business: null, labs: null, rest: { pricingVersionId: "rest-published", status: "TRIAL" }, management: null },
    });

    expect(state.tenantModules[0].activatedAt).toEqual(originalActivation);
    expect(state.contracts[0].activatedAt).toEqual(originalActivation);
  });

  it("uses deterministic collision-safe slugs for different primary owners", async () => {
    const first = createStatefulTx({ existingTenant: false });
    const second = createStatefulTx({ existingTenant: false });
    await Promise.all([
      applyClientProductAccess({ ...baseInput, tx: first.tx, ownerUserId: "owner-alpha", tenantSlugSeed: "Same Seed", access: { business: null, labs: null, rest: null, management: null } }),
      applyClientProductAccess({ ...baseInput, tx: second.tx, ownerUserId: "owner-beta", tenantSlugSeed: "Same Seed", access: { business: null, labs: null, rest: null, management: null } }),
    ]);

    expect(first.state.tenants[0].slug).toBe("same-seed-owner-alpha");
    expect(second.state.tenants[0].slug).toBe("same-seed-owner-beta");
    expect(first.state.tenants[0].slug).not.toBe(second.state.tenants[0].slug);
    expect(first.state.slugLookups).toBe(0);
    expect(first.state.membershipOrderBy).toBeNull();
  });

  it("lets the caller transaction roll back every write when Rest persistence fails", async () => {
    const { state, transaction } = createStatefulTx({ failRestWrite: true });
    const snapshot = structuredClone(state);

    await expect(transaction((transactionClient) => applyClientProductAccess({ ...baseInput, tx: transactionClient, access: { business: null, labs: null, rest: { pricingVersionId: "rest-published", status: "ACTIVE" }, management: { status: "ACTIVE" } } }))).rejects.toThrow("SIMULATED_REST_FAILURE");
    expect(state).toEqual(snapshot);
  });
});

describe("adaptLegacyClientProductAccessWithTx", () => {
  it("preserves every selected product from stored v2 through projection and legacy resubmission", async () => {
    const storedAccess = clientProductAccessSchema.parse({
      business: { submodules: [
        { id: "business-template", key: "plantilla", status: "ACTIVE", features: [{ featureId: "template-pages", enabled: true, value: 6 }] },
        { id: "business-custom", key: "personalizado", status: "TRIAL", features: [{ featureId: "custom-label", enabled: false, value: "Keep" }] },
      ] },
      labs: { submoduleId: "labs-growth", plan: "GROWTH", status: "TRIAL" },
      rest: { pricingVersionId: "rest-existing", status: "ACTIVE" },
      management: { status: "TRIAL" },
    });
    const reloadedAccess = parseStoredClientProductAccess({ version: 2, productAccess: storedAccess });
    expect(reloadedAccess).toEqual(storedAccess);
    const projected = projectClientProductAccessToLegacy(reloadedAccess!);
    const { tx } = createStatefulTx();

    const roundTripped = await adaptLegacyClientProductAccessWithTx({
      tx,
      ownerUserId: "owner-1",
      moduleIds: ["vase_business", "vase_labs", "vase_rest", "vase_management"],
      rawConfig: projected,
      storedAccess,
    });
    expect(roundTripped).toEqual(storedAccess);
  });

  it("maps the current form shape to authoritative Business, one Labs plan, and Management access", async () => {
    const { tx } = createStatefulTx();
    const access = await adaptLegacyClientProductAccessWithTx({
      tx,
      ownerUserId: "owner-1",
      moduleIds: ["vase_business", "vase_labs", "vase_management"],
      rawConfig: {
        tenantPlan: "PRO",
        proSubmoduleIds: ["business-template", "business-custom", "labs-growth", "labs-pro"],
        tenantName: "Untrusted tenant",
        tenantSlug: "untrusted-slug",
        accountName: "Untrusted account",
        industry: "Untrusted industry",
        tenantStatus: "SUSPENDED",
        tenantRole: "MEMBER",
        membershipStatus: "SUSPENDED",
        moduleLimits: { vase_labs: { chatbots: 99 } },
      },
    });

    expect(access).toEqual({
      business: {
        submodules: [
          { id: "business-template", key: "plantilla", status: "ACTIVE", features: [] },
          { id: "business-custom", key: "personalizado", status: "ACTIVE", features: [] },
        ],
      },
      labs: { submoduleId: "labs-growth", plan: "GROWTH", status: "ACTIVE" },
      rest: null,
      management: { status: "ACTIVE" },
    });
  });

  it("falls back to Starter for selected Labs and requires an explicit Rest choice when pricing is ambiguous", async () => {
    const starter = createStatefulTx();
    const labs = await adaptLegacyClientProductAccessWithTx({
      tx: starter.tx,
      ownerUserId: "owner-1",
      moduleIds: ["vase_labs"],
      rawConfig: { tenantPlan: "TRIAL", proSubmoduleIds: [] },
    });
    expect(labs.labs).toEqual({ submoduleId: "labs-starter", plan: "STARTER", status: "TRIAL" });

    const existingRest = createStatefulTx();
    existingRest.state.contracts.push({ tenantId: "tenant-1", pricingVersionId: "rest-existing", status: "TRIAL" });
    const reused = await adaptLegacyClientProductAccessWithTx({
      tx: existingRest.tx,
      ownerUserId: "owner-1",
      moduleIds: ["vase_rest"],
      rawConfig: { tenantPlan: "PRO", proSubmoduleIds: [] },
    });
    expect(reused.rest).toEqual({ pricingVersionId: "rest-existing", status: "TRIAL" });

    const unambiguous = createStatefulTx({ existingTenant: false });
    const bridged = await adaptLegacyClientProductAccessWithTx({
      tx: unambiguous.tx,
      ownerUserId: "new-owner",
      moduleIds: ["vase_rest"],
      rawConfig: { tenantPlan: "PRO", proSubmoduleIds: [] },
    });
    expect(bridged.rest).toEqual({ pricingVersionId: "starter-published", status: "ACTIVE" });

    const ambiguous = createStatefulTx();
    ambiguous.tx.restPricingVersion.findMany = async () => [{ id: "starter-1" }, { id: "starter-2" }];
    await expect(adaptLegacyClientProductAccessWithTx({
      tx: ambiguous.tx,
      ownerUserId: "new-owner",
      moduleIds: ["vase_rest"],
      rawConfig: { tenantPlan: "PRO", proSubmoduleIds: [] },
    })).rejects.toThrow("CLIENT_LEGACY_REST_PLAN_REQUIRED");
  });

  it("does not overgrant Business when a new legacy selection has no submodule ids", async () => {
    const fresh = createStatefulTx({ existingTenant: false });
    const freshAccess = await adaptLegacyClientProductAccessWithTx({
      tx: fresh.tx,
      ownerUserId: "new-owner",
      moduleIds: ["vase_business"],
      rawConfig: { tenantPlan: "TRIAL", proSubmoduleIds: [] },
    });
    expect(freshAccess.business).toEqual({ submodules: [] });
    await applyClientProductAccess({
      ...baseInput,
      tx: fresh.tx,
      ownerUserId: "new-owner",
      access: freshAccess,
      businessFeatureMode: "PRESERVE",
    });
    expect(fresh.state.tenantModules).toEqual(expect.arrayContaining([
      expect.objectContaining({ moduleId: "vase_business", isActive: true }),
    ]));
    expect(fresh.state.tenantSubmodules).toEqual([]);

    const existing = createStatefulTx();
    existing.state.tenantSubmodules.push({ tenantId: "tenant-1", submoduleId: "business-template", isActive: true, commercialStatus: "TRIAL", trialEndsAt: null });
    const existingAccess = await adaptLegacyClientProductAccessWithTx({
      tx: existing.tx,
      ownerUserId: "owner-1",
      moduleIds: ["vase_business"],
      rawConfig: { tenantPlan: "TRIAL", proSubmoduleIds: [] },
    });
    expect(existingAccess.business).toEqual({
      submodules: [{ id: "business-template", key: "plantilla", status: "TRIAL", features: [] }],
    });
    await applyClientProductAccess({ ...baseInput, tx: existing.tx, access: existingAccess, businessFeatureMode: "PRESERVE" });
    expect(existing.state.tenantSubmodules.find((item) => item.submoduleId === "business-template")).toMatchObject({
      isActive: true,
      commercialStatus: "TRIAL",
    });
  });
});

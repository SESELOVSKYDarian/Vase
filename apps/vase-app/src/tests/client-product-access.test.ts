import { describe, expect, it } from "vitest";
import {
  clientProductAccessSchema,
  clientProductAccessEnvelopeSchema,
  buildClientProductAccessAuditChange,
  getLabsEntitlement,
  projectClientProductAccessToLegacy,
} from "@/lib/admin/client-product-access";

const disabledProducts = {
  business: null,
  labs: null,
  rest: null,
  management: null,
};

describe("client product access", () => {
  it("allows Business submodules to have independent commercial statuses", () => {
    const parsed = clientProductAccessSchema.parse({
      ...disabledProducts,
      business: {
        submodules: [
          {
            id: "business-template",
            key: "plantilla",
            status: "ACTIVE",
            features: [],
          },
          {
            id: "business-custom",
            key: "personalizado",
            status: "TRIAL",
            features: [],
          },
        ],
      },
    });

    expect(parsed.business?.submodules.map((submodule) => submodule.status)).toEqual([
      "ACTIVE",
      "TRIAL",
    ]);
  });

  it.each([
    [
      "STARTER",
      { whatsapp: 1, instagram: 0, messenger: 0 },
      {
        maxKnowledgeItems: 25,
        maxFiles: 8,
        maxUrls: 5,
        monthlyConversationLimit: 300,
        maxChannels: 1,
        legacyPlan: "START",
      },
    ],
    [
      "PRO",
      { whatsapp: 1, instagram: 1, messenger: 0 },
      {
        maxKnowledgeItems: 80,
        maxFiles: 25,
        maxUrls: 20,
        monthlyConversationLimit: 2500,
        maxChannels: 2,
        legacyPlan: "PREMIUM",
      },
    ],
    [
      "GROWTH",
      { whatsapp: 1, instagram: 1, messenger: 1 },
      {
        maxKnowledgeItems: 120,
        maxFiles: 40,
        maxUrls: 30,
        monthlyConversationLimit: 5000,
        maxChannels: 3,
        legacyPlan: "PREMIUM",
      },
    ],
  ] as const)("maps %s to fixed channels and workspace capacities", (plan, channels, capacities) => {
    const entitlement = getLabsEntitlement(plan);

    expect(entitlement.channels).toEqual(channels);
    expect(entitlement).toMatchObject(capacities);
  });

  it("rejects duplicate Business submodule ids and keys", () => {
    const submodule = {
      id: "business-template",
      key: "plantilla" as const,
      status: "ACTIVE" as const,
      features: [],
    };

    expect(
      clientProductAccessSchema.safeParse({
        ...disabledProducts,
        business: { submodules: [submodule, { ...submodule, key: "personalizado" }] },
      }).success,
    ).toBe(false);
    expect(
      clientProductAccessSchema.safeParse({
        ...disabledProducts,
        business: { submodules: [submodule, { ...submodule, id: "business-custom" }] },
      }).success,
    ).toBe(false);
  });

  it("accepts explicitly disabled products", () => {
    expect(clientProductAccessSchema.parse(disabledProducts)).toEqual(disabledProducts);
  });

  it("requires a published Rest pricing version", () => {
    expect(
      clientProductAccessSchema.safeParse({
        ...disabledProducts,
        rest: { status: "ACTIVE" },
      }).success,
    ).toBe(false);
  });

  it("rejects technical tenant fields and unknown nested fields", () => {
    expect(
      clientProductAccessSchema.safeParse({
        ...disabledProducts,
        tenantSlug: "do-not-accept",
      }).success,
    ).toBe(false);
    expect(
      clientProductAccessSchema.safeParse({
        ...disabledProducts,
        labs: {
          submoduleId: "labs-pro",
          plan: "PRO",
          status: "ACTIVE",
          tenantRole: "OWNER",
        },
      }).success,
    ).toBe(false);
  });

  it("requires feature number values to be integers", () => {
    expect(
      clientProductAccessSchema.safeParse({
        ...disabledProducts,
        business: {
          submodules: [
            {
              id: "business-template",
              key: "plantilla",
              status: "ACTIVE",
              features: [{ featureId: "page-limit", enabled: true, value: 1.5 }],
            },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("projects a v2 snapshot to the current legacy form without losing selected submodules", () => {
    const access = clientProductAccessSchema.parse({
      business: { submodules: [
        { id: "business-template", key: "plantilla", status: "ACTIVE", features: [{ featureId: "pages", enabled: true, value: 7 }] },
        { id: "business-custom", key: "personalizado", status: "TRIAL", features: [] },
      ] },
      labs: { submoduleId: "labs-growth", plan: "GROWTH", status: "TRIAL" },
      rest: { pricingVersionId: "rest-9", status: "ACTIVE" },
      management: { status: "TRIAL" },
    });

    expect(projectClientProductAccessToLegacy(access)).toEqual({
      tenantPlan: "PRO",
      proSubmoduleIds: ["business-template", "business-custom", "labs-growth"],
      moduleLimits: {},
    });
  });

  it.each(["tenantSlug", "tenantStatus", "unknownRoot"])(
    "rejects the extra v2 envelope root field %s",
    (field) => {
      expect(clientProductAccessEnvelopeSchema.safeParse({
        version: 2,
        productAccess: disabledProducts,
        [field]: "technical-value",
      }).success).toBe(false);
    },
  );

  it("builds a safe, reconstructable access diff without exposing feature values", () => {
    const before = clientProductAccessSchema.parse({
      business: { submodules: [{
        id: "business-template",
        key: "plantilla",
        status: "TRIAL",
        features: [{ featureId: "headline", enabled: true, value: "secret-before" }],
      }] },
      labs: { submoduleId: "labs-pro", plan: "PRO", status: "TRIAL" },
      rest: { pricingVersionId: "pricing-1", status: "TRIAL" },
      management: null,
    });
    const after = clientProductAccessSchema.parse({
      business: { submodules: [{
        id: "business-template",
        key: "plantilla",
        status: "ACTIVE",
        features: [{ featureId: "headline", enabled: false, value: "secret-after" }],
      }] },
      labs: { submoduleId: "labs-growth", plan: "GROWTH", status: "ACTIVE" },
      rest: { pricingVersionId: "pricing-2", status: "ACTIVE" },
      management: null,
    });

    const change = buildClientProductAccessAuditChange(before, after);

    expect(change.before).toMatchObject({
      business: [{ submoduleId: "business-template", status: "TRIAL" }],
      labs: { plan: "PRO", status: "TRIAL" },
      rest: { pricingVersionId: "pricing-1", status: "TRIAL" },
    });
    expect(change.after).toMatchObject({
      business: [{ submoduleId: "business-template", status: "ACTIVE" }],
      labs: { plan: "GROWTH", status: "ACTIVE" },
      rest: { pricingVersionId: "pricing-2", status: "ACTIVE" },
    });
    expect(change.featureChanges).toEqual([{
      submoduleId: "business-template",
      featureId: "headline",
      change: "STATE_AND_VALUE_CHANGED",
      beforeEnabled: true,
      afterEnabled: false,
      valueChanged: true,
    }]);
    expect(JSON.stringify(change)).not.toContain("secret-before");
    expect(JSON.stringify(change)).not.toContain("secret-after");
  });
});

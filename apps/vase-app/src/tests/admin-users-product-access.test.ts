import { describe, expect, it } from "vitest";
import {
  deriveCanonicalClientProductAccess,
  resolveAdminOwnerTenantContext,
} from "@/server/queries/admin-users";

const modules = {
  business: { id: "vase_business", product: "BUSINESS" as const },
  labs: { id: "vase_labs", product: "LABS" as const },
  rest: { id: "vase_rest", product: "REST" as const },
  management: { id: "vase_management", product: "MANAGEMENT" as const },
};

const staleStoredAccess = {
  business: { submodules: [{ id: "business-template", key: "plantilla" as const, status: "ACTIVE" as const, features: [] }] },
  labs: { submoduleId: "labs-starter", plan: "STARTER" as const, status: "ACTIVE" as const },
  rest: { pricingVersionId: "rest-v1", status: "ACTIVE" as const },
  management: { status: "ACTIVE" as const },
};

describe("admin user canonical product access", () => {
  it("keeps the primary owned tenant when its Owner membership is suspended", () => {
    const tenantA = { id: "tenant-a", name: "Owner account" };
    const tenantB = { id: "tenant-b", name: "Managed account" };

    const context = resolveAdminOwnerTenantContext(tenantA, [
      { role: "MANAGER", status: "ACTIVE", tenant: tenantB },
      { role: "OWNER", status: "SUSPENDED", tenant: tenantA },
    ]);

    expect(context).toEqual({
      tenant: tenantA,
      membership: { role: "OWNER", status: "SUSPENDED", tenant: tenantA },
    });
  });

  it("uses only one unambiguous legacy Owner membership and never a Manager membership", () => {
    const tenantA = { id: "tenant-a" };
    const tenantB = { id: "tenant-b" };
    const manager = { role: "MANAGER" as const, status: "ACTIVE" as const, tenant: tenantB };
    const owner = { role: "OWNER" as const, status: "SUSPENDED" as const, tenant: tenantA };

    expect(resolveAdminOwnerTenantContext(null, [manager, owner])).toEqual({ tenant: tenantA, membership: owner });
    expect(resolveAdminOwnerTenantContext(null, [manager])).toBeNull();
    expect(resolveAdminOwnerTenantContext(null, [
      owner,
      { role: "OWNER", status: "ACTIVE", tenant: tenantB },
    ])).toBeNull();
    expect(resolveAdminOwnerTenantContext(null, [{
      role: "OWNER",
      status: "ACTIVE",
      tenant: { id: "claimed", primaryOwnerUserId: "another-owner" },
    }])).toBeNull();
  });

  it("does not let stale JSON or user access re-enable a suspended tenant", () => {
    const access = deriveCanonicalClientProductAccess({
      tenantStatus: "SUSPENDED",
      membershipStatus: "ACTIVE",
      modules: Object.values(modules),
      ownerModuleAccesses: Object.values(modules).map((module) => ({ moduleId: module.id, isActive: true })),
      tenantModules: Object.values(modules).map((module) => ({ moduleId: module.id, isActive: true, commercialStatus: "ACTIVE" as const })),
      tenantSubmodules: [
        { submoduleId: "business-template", moduleId: modules.business.id, key: "plantilla", isActive: true, commercialStatus: "ACTIVE" },
        { submoduleId: "labs-starter", moduleId: modules.labs.id, key: "starter", isActive: true, commercialStatus: "ACTIVE" },
      ],
      featureGrants: [],
      businessFeatures: [],
      restContract: { pricingVersionId: "rest-v1", status: "ACTIVE", pricingStatus: "PUBLISHED" },
      storedAccess: staleStoredAccess,
    });

    expect(access).toEqual({ business: null, labs: null, rest: null, management: null });
  });

  it("uses conjunctive relational gates and keeps a suspended Rest contract disabled", () => {
    const access = deriveCanonicalClientProductAccess({
      tenantStatus: "ACTIVE",
      membershipStatus: "ACTIVE",
      modules: Object.values(modules),
      ownerModuleAccesses: [
        { moduleId: modules.business.id, isActive: true },
        { moduleId: modules.labs.id, isActive: false },
        { moduleId: modules.rest.id, isActive: true },
      ],
      tenantModules: [
        { moduleId: modules.business.id, isActive: true, commercialStatus: "ACTIVE" },
        { moduleId: modules.labs.id, isActive: true, commercialStatus: "ACTIVE" },
        { moduleId: modules.rest.id, isActive: true, commercialStatus: "ACTIVE" },
      ],
      tenantSubmodules: [
        { submoduleId: "business-template", moduleId: modules.business.id, key: "plantilla", isActive: true, commercialStatus: "TRIAL" },
        { submoduleId: "labs-starter", moduleId: modules.labs.id, key: "starter", isActive: true, commercialStatus: "ACTIVE" },
      ],
      featureGrants: [],
      businessFeatures: [],
      restContract: { pricingVersionId: "rest-v1", status: "SUSPENDED", pricingStatus: "PUBLISHED" },
      storedAccess: staleStoredAccess,
    });

    expect(access.business?.submodules).toEqual([{ id: "business-template", key: "plantilla", status: "TRIAL", features: [] }]);
    expect(access.labs).toBeNull();
    expect(access.rest).toBeNull();
    expect(access.management).toBeNull();
  });

  it("places module-wide grants once so they remain visible and editable", () => {
    const access = deriveCanonicalClientProductAccess({
      tenantStatus: "ACTIVE",
      membershipStatus: "ACTIVE",
      modules: Object.values(modules),
      ownerModuleAccesses: [],
      tenantModules: [{ moduleId: modules.business.id, isActive: true, commercialStatus: "ACTIVE" }],
      tenantSubmodules: [
        { submoduleId: "business-template", moduleId: modules.business.id, key: "plantilla", isActive: true, commercialStatus: "ACTIVE" },
        { submoduleId: "business-custom", moduleId: modules.business.id, key: "personalizado", isActive: true, commercialStatus: "ACTIVE" },
      ],
      featureGrants: [{ featureId: "general-domains", enabled: true, value: 4, submoduleId: null }],
      businessFeatures: [{ id: "general-domains", submoduleId: null }],
      restContract: null,
      storedAccess: null,
    });

    expect(access.business?.submodules.flatMap((submodule) => submodule.features)).toEqual([
      { featureId: "general-domains", enabled: true, value: 4 },
    ]);
  });
});

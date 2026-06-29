import { describe, expect, it } from "vitest";
import {
  createLabsCheckoutPreview,
  createLabsEntitlementProjection,
  createLabsTenantProvisioning,
} from "../apps/vase-app/src/lib/labs/billing-preparation";

describe("Vase App Labs billing preparation", () => {
  it("previews a future Labs checkout without processing payment", () => {
    const preview = createLabsCheckoutPreview({
      globalTenantId: "tenant_123",
      companyName: "Norte Equipos",
      plan: "GROWTH",
      tokenPack: "BASIC",
    });

    expect(preview.paymentRequired).toBe(false);
    expect(preview.productKey).toBe("labs");
    expect(preview.access.enabledChannels).toEqual(["WHATSAPP", "INSTAGRAM"]);
    expect(preview.access.tokensIncluded).toBe(250000);
    expect(preview.access.extraTokens).toBe(100000);
  });

  it("creates a tenant provisioning payload with company, tenant and owner membership", () => {
    const provisioning = createLabsTenantProvisioning({
      globalCompanyId: "company_123",
      globalTenantId: "tenant_123",
      globalUserId: "user_123",
      companyName: "Norte Equipos",
      tenantSlug: "norte-equipos",
      plan: "STARTER",
      tokenPack: null,
    });

    expect(provisioning.company.name).toBe("Norte Equipos");
    expect(provisioning.tenant.slug).toBe("norte-equipos");
    expect(provisioning.membership.role).toBe("OWNER");
    expect(provisioning.labsAccess.enabledChannels).toEqual(["WHATSAPP"]);
  });

  it("creates a Labs entitlement projection that Labs can read by contract/API", () => {
    const projection = createLabsEntitlementProjection({
      globalTenantId: "tenant_123",
      plan: "PRO",
      tokenPack: "MEDIUM",
      status: "ACTIVE",
    });

    expect(projection.productKey).toBe("labs");
    expect(projection.status).toBe("ACTIVE");
    expect(projection.labs.plan).toBe("PRO");
    expect(projection.labs.enabledChannels).toEqual(["WHATSAPP", "INSTAGRAM", "FACEBOOK"]);
    expect(projection.labs.tokensIncluded).toBe(1000000);
    expect(projection.labs.extraTokens).toBe(500000);
  });
});

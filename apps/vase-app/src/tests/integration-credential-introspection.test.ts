import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSecret } from "@/lib/integrations/credentials";

const findFirst = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    integrationApiCredential: {
      findFirst,
    },
  },
}));

describe("business integration credential introspection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("accepts active products:sync credentials from vase-app", async () => {
    findFirst.mockResolvedValue({
      id: "cred_123",
      name: "ERP principal",
      keyId: "abcd1234",
      keyPrefix: "vsk_live_abcd1234",
      tokenHash: hashSecret("vsk_live_abcd1234_secret-token-value"),
      scopes: ["products:sync"],
      status: "ACTIVE",
      revokedAt: null,
      expiresAt: null,
      tenant: {
        id: "tenant_123",
        slug: "tenant-demo",
      },
    });

    const { introspectBusinessIntegrationCredential } = await import(
      "@/server/services/integration-credentials"
    );

    await expect(
      introspectBusinessIntegrationCredential({
        tenantSlug: "tenant-demo",
        token: "vsk_live_abcd1234_secret-token-value",
        scope: "products:sync",
      }),
    ).resolves.toEqual({
      tenantId: "tenant_123",
      tenantSlug: "tenant-demo",
      credentialId: "cred_123",
      credentialName: "ERP principal",
      scope: "products:sync",
    });
  });
});

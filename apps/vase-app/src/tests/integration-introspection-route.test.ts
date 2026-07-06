import { beforeEach, describe, expect, it, vi } from "vitest";

const introspectBusinessIntegrationCredential = vi.fn();

vi.mock("@/server/services/integration-credentials", () => ({
  introspectBusinessIntegrationCredential,
}));

describe("internal business integration credential introspection route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SERVICE_TO_SERVICE_TOKEN = "service-token";
  });

  it("authorizes a products:sync credential for business.vase.ar", async () => {
    introspectBusinessIntegrationCredential.mockResolvedValue({
      tenantId: "tenant_123",
      tenantSlug: "tenant-demo",
      credentialId: "cred_123",
      credentialName: "ERP principal",
      scope: "products:sync",
    });

    const { POST } = await import(
      "@/app/api/internal/business/integrations/credentials/route"
    );

    const response = await POST(
      new Request("http://localhost/api/internal/business/integrations/credentials", {
        method: "POST",
        headers: {
          authorization: "Bearer service-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantSlug: "tenant-demo",
          token: "vsk_live_abcd1234_secret-token-value",
          scope: "products:sync",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        tenantId: "tenant_123",
        tenantSlug: "tenant-demo",
        credentialId: "cred_123",
      }),
    );
    expect(introspectBusinessIntegrationCredential).toHaveBeenCalledWith({
      tenantSlug: "tenant-demo",
      token: "vsk_live_abcd1234_secret-token-value",
      scope: "products:sync",
      consumerSecret: null,
    });
  });
});

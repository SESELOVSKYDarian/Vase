import { describe, expect, it } from "vitest";
import { createRestContextClient } from "../apps/vase-rest/app/lib/app-session-context";
import { signRestSessionContext } from "../apps/vase-app/src/server/services/rest-session-context";

const context = {
  globalTenantId: "tenant_123",
  tenantSlug: "norte",
  tenantName: "Norte",
  actor: { kind: "GLOBAL_USER" as const, id: "user_123", displayName: "Owner" },
  branchId: null,
  branchRoles: [],
  deviceId: null,
  entitlement: {
    globalTenantId: "tenant_123",
    plan: "GROWTH" as const,
    status: "ACTIVE" as const,
    limits: { branches: 3, localEmployees: 60, devices: 20, edgeInstallations: 3 },
    contractVersion: 2,
  },
};

describe("Rest App session-context client", () => {
  it("authenticates service-to-service, verifies the signature, and does not forward cookies", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const signingSecret = "context-signing-secret-with-32-characters";
    const client = createRestContextClient({
      appInternalUrl: "http://app-vase:3002",
      serviceToken: "service-secret",
      signingSecret,
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        const body = JSON.stringify(context);
        return new Response(body, {
          headers: {
            "content-type": "application/json",
            "x-vase-context-signature": signRestSessionContext(body, signingSecret),
          },
        });
      },
    });

    await expect(client.resolve({
      globalUserId: "user_123",
      requestedTenantSlug: "norte",
    })).resolves.toEqual(context);
    expect(new Headers(requests[0]?.init?.headers).get("authorization"))
      .toBe("Bearer service-secret");
    expect(new Headers(requests[0]?.init?.headers).has("cookie")).toBe(false);
  });

  it("rejects missing service configuration, invalid signatures and inactive contracts", async () => {
    await expect(createRestContextClient({
      appInternalUrl: "http://app-vase:3002",
      serviceToken: undefined,
      signingSecret: "context-signing-secret-with-32-characters",
    }).resolve({ globalUserId: "user_123" })).rejects.toThrow("REST_APP_UNAVAILABLE");

    const invalid = createRestContextClient({
      appInternalUrl: "http://app-vase:3002",
      serviceToken: "service-secret",
      signingSecret: "context-signing-secret-with-32-characters",
      fetcher: async () => new Response(JSON.stringify(context), {
        headers: { "x-vase-context-signature": "invalid" },
      }),
    });
    await expect(invalid.resolve({ globalUserId: "user_123" }))
      .rejects.toThrow("REST_APP_CONTEXT_INVALID");

    const inactive = createRestContextClient({
      appInternalUrl: "http://app-vase:3002",
      serviceToken: "service-secret",
      signingSecret: "context-signing-secret-with-32-characters",
      fetcher: async () => Response.json({ error: "REST_CONTRACT_INACTIVE" }, { status: 409 }),
    });
    await expect(inactive.resolve({ globalUserId: "user_123" }))
      .rejects.toThrow("REST_CONTRACT_INACTIVE");
  });
});

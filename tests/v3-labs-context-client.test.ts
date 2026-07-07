import { describe, expect, it } from "vitest";
import { createLabsContextClient } from "../apps/vase-labs/app/lib/app-session-context";

describe("Labs App session-context client", () => {
  it("uses service authentication and never forwards the browser cookie", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = createLabsContextClient({
      appInternalUrl: "http://app-vase:3002",
      serviceToken: "service-secret",
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({
          globalUserId: "user_123",
          globalTenantId: "tenant_123",
          tenantSlug: "norte-equipos",
          tenantName: "Norte Equipos",
          role: "OWNER",
          entitlement: {
            plan: "GROWTH",
            status: "ACTIVE",
            enabledChannels: ["WHATSAPP", "INSTAGRAM"],
          },
        });
      },
    });

    const result = await client.resolve({
      globalUserId: "user_123",
      requestedTenantSlug: "norte-equipos",
    });

    expect(result.globalTenantId).toBe("tenant_123");
    expect(requests[0]?.url).toContain("tenantSlug=norte-equipos");
    expect(new Headers(requests[0]?.init?.headers).get("authorization")).toBe(
      "Bearer service-secret",
    );
    expect(new Headers(requests[0]?.init?.headers).has("cookie")).toBe(false);
  });
});

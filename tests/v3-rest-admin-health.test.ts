import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../apps/vase-admin/app/api/rest/health/route";

afterEach(() => vi.restoreAllMocks());

describe("Vase Admin Rest health", () => {
  it("proxies health to Rest without database access", async () => {
    process.env.REST_INTERNAL_URL = "http://vase-rest:3009";
    process.env.SERVICE_TO_SERVICE_TOKEN = "service-token";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({
        actor: { id: "admin_123", platformRole: "SUPER_ADMIN" },
      }))
      .mockResolvedValueOnce(Response.json({ service: "vase-rest", status: "ok" }));

    const response = await GET(new Request("https://admin.vase.ar/api/rest/health", {
      headers: { cookie: "__Secure-authjs.session-token=session" },
    }));
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0].toString()).toContain("/api/internal/admin/session");
    expect(fetchMock.mock.calls[1][0].toString()).toContain("http://vase-rest:3009/api/internal/admin/health");
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ authorization: "Bearer service-token" });
  });
});

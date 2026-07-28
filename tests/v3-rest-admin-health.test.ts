import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../apps/vase-admin/app/api/rest/health/route";

afterEach(() => vi.restoreAllMocks());

describe("Vase Admin Rest health", () => {
  it("proxies health to Rest without database access", async () => {
    process.env.REST_INTERNAL_URL = "http://vase-rest:3009";
    process.env.SERVICE_TO_SERVICE_TOKEN = "service-token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ service: "vase-rest", status: "ok" }),
    );

    const response = await GET();
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0].toString()).toContain("http://vase-rest:3009/api/internal/admin/health");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ authorization: "Bearer service-token" });
  });
});

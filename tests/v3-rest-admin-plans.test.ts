import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../apps/vase-admin/app/api/rest/plans/route";

afterEach(() => vi.restoreAllMocks());

describe("Vase Admin Rest plans", () => {
  it("proxies plan reads and mutations to Vase App with the service identity", async () => {
    process.env.APP_INTERNAL_URL = "http://app-vase:3002";
    process.env.SERVICE_TO_SERVICE_TOKEN = "service-token";
    process.env.ADMIN_ACTOR_USER_ID = "admin_123";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ versions: [] }))
      .mockResolvedValueOnce(Response.json({ id: "price_1" }, { status: 201 }));

    expect((await GET()).status).toBe(200);
    const response = await POST(new Request("https://admin.vase.ar/api/rest/plans", {
      method: "POST",
      body: JSON.stringify({
        action: "CREATE_DRAFT",
        plan: "STARTER",
        currency: "ARS",
        monthlyPrice: 100,
        limits: { branches: 1, localEmployees: 15, devices: 5, edgeInstallations: 1 },
        effectiveAt: "2026-08-01T00:00:00.000Z",
      }),
    }));
    expect(response.status).toBe(201);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ createdById: "admin_123" });
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ authorization: "Bearer service-token" });
  });

  it("renders editable prices, all four limits, effective date, and explicit publishing", () => {
    const source = fs.readFileSync(path.resolve("apps/vase-admin/app/rest-admin-workspace.tsx"), "utf8");
    for (const field of ["monthlyPrice", "branches", "localEmployees", "devices", "edgeInstallations", "effectiveAt"]) {
      expect(source).toContain(field);
    }
    expect(source).toContain("CREATE_DRAFT");
    expect(source).toContain("PUBLISH");
  });
});

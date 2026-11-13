import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/business-profile", () => ({ getBusinessProfilePayload: vi.fn() }));

const { createBusinessProfileHandler } = await import("@/app/api/internal/business/business-profile/handler");

const allow = () => {};
const deny = () => {
  throw new Error("FORBIDDEN");
};

describe("internal business profile route", () => {
  it("rejects calls without the service token", async () => {
    const handler = createBusinessProfileHandler({ authorize: deny, loadProfile: async () => ({}) });
    const response = await handler(new Request("https://app.vase.ar/api/internal/business/business-profile?globalTenantId=t1"));
    expect(response.status).toBe(403);
  });

  it("needs a tenant id", async () => {
    const handler = createBusinessProfileHandler({ authorize: allow, loadProfile: async () => ({}) });
    const response = await handler(new Request("https://app.vase.ar/api/internal/business/business-profile"));
    expect(response.status).toBe(400);
  });

  it("returns the profile or 404", async () => {
    const loadProfile = vi.fn(async (id: string) => (id === "t1" ? { name: "Piquim" } : null));
    const handler = createBusinessProfileHandler({ authorize: allow, loadProfile });
    const ok = await handler(new Request("https://app.vase.ar/x?globalTenantId=t1"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ profile: { name: "Piquim" } });
    const missing = await handler(new Request("https://app.vase.ar/x?globalTenantId=t2"));
    expect(missing.status).toBe(404);
  });
});

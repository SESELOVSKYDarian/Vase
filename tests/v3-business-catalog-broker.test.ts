import { describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { tenant: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { createBusinessCatalogSnapshotBrokerHandler } from "../apps/vase-app/src/app/api/internal/business/catalog-snapshot/route";

const payload = (globalTenantId = "tenant_123") => ({
  eventId: "event-1",
  globalTenantId,
  occurredAt: "2026-07-22T13:00:00.000Z",
  products: [{
    externalProductId: "erp-1",
    sku: "SKU-1",
    name: "Producto",
    description: null,
    price: 100,
    stock: 2,
    imageUrl: null,
    categories: [],
    active: true,
    sourceUpdatedAt: "2026-07-22T12:00:00.000Z",
  }],
});

function setup(options?: {
  tenant?: { id: string } | null;
  upstream?: Response | Error;
  authorizeError?: Error;
  businessEditorUrl?: string;
  serviceToken?: string;
}) {
  const authorize = vi.fn(() => {
    if (options?.authorizeError) throw options.authorizeError;
  });
  const findTenant = vi.fn(async () => options?.tenant === undefined ? { id: "tenant_123" } : options.tenant);
  const fetchUpstream = vi.fn(async () => {
    if (options?.upstream instanceof Error) throw options.upstream;
    return options?.upstream ?? Response.json(payload());
  });
  return {
    authorize,
    findTenant,
    fetchUpstream,
    GET: createBusinessCatalogSnapshotBrokerHandler({
      authorize,
      findTenant,
      fetchUpstream: fetchUpstream as typeof fetch,
      businessEditorUrl: options?.businessEditorUrl ?? "https://business.vase.ar/admin/evolution",
      serviceToken: options?.serviceToken ?? "service-token",
    }),
  };
}

function request(tenant = "tenant_123") {
  return new Request(`http://app-vase:3002/api/internal/business/catalog-snapshot?globalTenantId=${tenant}`, {
    headers: { authorization: "Bearer service-token" },
  });
}

describe("Vase App Business catalog snapshot broker", () => {
  it("validates the platform tenant and dynamically calls Business", async () => {
    const { GET, authorize, findTenant, fetchUpstream } = setup();
    const response = await GET(request());

    expect(authorize).toHaveBeenCalledWith("Bearer service-token");
    expect(findTenant).toHaveBeenCalledWith("tenant_123");
    expect(fetchUpstream).toHaveBeenCalledWith(
      "https://business.vase.ar/api/v1/integrations/internal/tenant/tenant_123/catalog-snapshot",
      { headers: { authorization: "Bearer service-token" }, signal: expect.any(AbortSignal) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload());
  });

  it("rejects a snapshot belonging to another tenant", async () => {
    const response = await setup({ upstream: Response.json(payload("tenant_other")) }).GET(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE",
      reason: "UPSTREAM_RESPONSE_INVALID",
    });
  });

  it("rejects malformed product data instead of forwarding it", async () => {
    const invalid = { ...payload(), products: [{ name: "sin id" }] };
    const response = await setup({ upstream: Response.json(invalid) }).GET(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE",
      reason: "UPSTREAM_RESPONSE_INVALID",
    });
  });

  it("preserves the not-connected result", async () => {
    const response = await setup({
      upstream: Response.json({ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" }, { status: 404 }),
    }).GET(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" });
  });

  it("does not call Business for an unknown global tenant", async () => {
    const { GET, fetchUpstream } = setup({ tenant: null });
    const response = await GET(request("tenant_unknown"));
    expect(response.status).toBe(404);
    expect(fetchUpstream).not.toHaveBeenCalled();
  });

  it("requires internal service authentication", async () => {
    const { GET, findTenant } = setup({ authorizeError: new Error("FORBIDDEN") });
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(findTenant).not.toHaveBeenCalled();
  });
});

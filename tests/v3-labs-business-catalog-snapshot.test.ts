import { describe, expect, it, vi } from "vitest";
import { createBusinessCatalogSnapshotImporter } from "../apps/vase-labs/app/lib/business-catalog-snapshot";

const snapshot = (tenant = "tenant/resolved", products: unknown[] = []) => ({
  eventId: "event-1",
  globalTenantId: tenant,
  occurredAt: "2026-07-22T13:00:00.000Z",
  products,
});

function setup(response: Response | Error, overrides?: { appInternalUrl?: string; serviceToken?: string }) {
  const fetchUpstream = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  const sync = vi.fn(async () => ({ processed: true, count: 0 }));
  return {
    fetchUpstream,
    sync,
    importSnapshot: createBusinessCatalogSnapshotImporter({
      fetchUpstream: fetchUpstream as typeof fetch,
      sync,
      appInternalUrl: overrides?.appInternalUrl ?? "http://app-vase:3002///",
      serviceToken: overrides?.serviceToken ?? "service-token",
    }),
  };
}

describe("Labs Business catalog snapshot importer", () => {
  it("fetches through Vase App and imports an empty valid catalog", async () => {
    const { importSnapshot, fetchUpstream, sync } = setup(Response.json(snapshot()));
    await expect(importSnapshot("tenant/resolved")).resolves.toEqual({ processed: true, count: 0 });
    expect(fetchUpstream).toHaveBeenCalledWith(
      "http://app-vase:3002/api/internal/business/catalog-snapshot?globalTenantId=tenant%2Fresolved",
      { headers: { authorization: "Bearer service-token" }, signal: expect.any(AbortSignal) },
    );
    expect(sync).toHaveBeenCalledWith(snapshot());
  });

  it("rejects a cross-tenant snapshot before writing catalog data", async () => {
    const { importSnapshot, sync } = setup(Response.json(snapshot("tenant/other")));
    await expect(importSnapshot("tenant/resolved")).rejects.toThrow("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    expect(sync).not.toHaveBeenCalled();
  });

  it("preserves the normal not-connected state", async () => {
    const { importSnapshot } = setup(Response.json(
      { error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" },
      { status: 404 },
    ));
    await expect(importSnapshot("tenant/resolved")).rejects.toThrow("EXTERNAL_MANAGEMENT_NOT_CONNECTED");
  });

  it("fails closed when internal configuration is missing", async () => {
    const { importSnapshot, fetchUpstream } = setup(Response.json(snapshot()), {
      appInternalUrl: " ",
      serviceToken: " ",
    });
    await expect(importSnapshot("tenant/resolved")).rejects.toThrow("EXTERNAL_MANAGEMENT_CATALOG_UNAVAILABLE");
    expect(fetchUpstream).not.toHaveBeenCalled();
  });
});

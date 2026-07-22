import { describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { tenant: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { createBusinessExternalManagementCredentialsHandler } from "../apps/vase-app/src/app/api/internal/business/external-management-credentials/route";

function handler(options?: {
  tenant?: { id: string } | null;
  upstream?: Response | Error;
  businessEditorUrl?: string;
  serviceToken?: string;
  authorizeError?: Error;
}) {
  const findTenant = vi.fn(async () => options?.tenant === undefined ? { id: "tenant_123" } : options.tenant);
  const fetchUpstream = vi.fn(async () => {
    if (options?.upstream instanceof Error) throw options.upstream;
    return options?.upstream ?? Response.json({
      domain: "business.vase.ar",
      tenantUuid: "tenant_123",
      consumerKey: "consumer-key",
      consumerSecret: "must-not-leak",
    });
  });
  const authorize = vi.fn(() => {
    if (options?.authorizeError) throw options.authorizeError;
  });

  return {
    authorize,
    findTenant,
    fetchUpstream,
    GET: createBusinessExternalManagementCredentialsHandler({
      authorize,
      findTenant,
      fetchUpstream: fetchUpstream as typeof fetch,
      businessEditorUrl: options?.businessEditorUrl ?? "http://vase-business:3000/admin/evolution",
      serviceToken: options?.serviceToken ?? "service-token",
    }),
  };
}

function request(tenant = "tenant_123", authorization = "Bearer service-token") {
  const url = new URL("http://vase-app:3002/api/internal/business/external-management-credentials");
  url.searchParams.set("globalTenantId", tenant);
  return new Request(url, { headers: { authorization } });
}

describe("Vase App Business credential broker", () => {
  it("validates the platform tenant and allowlists its Business credential", async () => {
    const { GET, authorize, findTenant, fetchUpstream } = handler();
    const response = await GET(request());

    expect(authorize).toHaveBeenCalledWith("Bearer service-token");
    expect(findTenant).toHaveBeenCalledWith("tenant_123");
    expect(fetchUpstream).toHaveBeenCalledWith(
      "http://vase-business:3000/api/v1/integrations/internal/tenant/tenant_123/product-sync-credentials",
      { headers: { authorization: "Bearer service-token" }, signal: expect.any(AbortSignal) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      domain: "business.vase.ar",
      tenantUuid: "tenant_123",
      consumerKey: "consumer-key",
    });
  });

  it("rejects invalid service authentication before tenant lookup", async () => {
    const { GET, findTenant, fetchUpstream } = handler({ authorizeError: new Error("FORBIDDEN") });
    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN" });
    expect(findTenant).not.toHaveBeenCalled();
    expect(fetchUpstream).not.toHaveBeenCalled();
  });

  it("does not query Business for an unknown platform tenant", async () => {
    const { GET, fetchUpstream } = handler({ tenant: null });
    const response = await GET(request("tenant_unknown"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "TENANT_NOT_FOUND" });
    expect(fetchUpstream).not.toHaveBeenCalled();
  });

  it("preserves the normal not-connected state from Business", async () => {
    const { GET } = handler({
      upstream: Response.json({ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" }, { status: 404 }),
    });
    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" });
  });

  it.each([
    [new Response("service auth detail", { status: 403 }), "UPSTREAM_FORBIDDEN"],
    [new Response("database detail", { status: 500 }), "UPSTREAM_UNAVAILABLE"],
    [new Response("not-json", { status: 200 }), "UPSTREAM_RESPONSE_INVALID"],
    [Response.json({ domain: "business.vase.ar", tenantUuid: "tenant_other", consumerKey: "key" }), "UPSTREAM_RESPONSE_INVALID"],
  ])("sanitizes upstream failure %#", async (upstream, reason) => {
    const response = await handler({ upstream }).GET(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "EXTERNAL_MANAGEMENT_CREDENTIALS_UNAVAILABLE",
      reason,
    });
  });

  it("identifies missing Business broker configuration", async () => {
    const { GET, fetchUpstream } = handler({ businessEditorUrl: " ", serviceToken: " " });
    const response = await GET(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "EXTERNAL_MANAGEMENT_CREDENTIALS_UNAVAILABLE",
      reason: "CONFIGURATION_MISSING",
    });
    expect(fetchUpstream).not.toHaveBeenCalled();
  });
});

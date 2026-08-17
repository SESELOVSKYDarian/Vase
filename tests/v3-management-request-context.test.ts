import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { managementSessionContextSchema } from "../packages/contracts/src/index";

vi.mock(
  "../apps/vase-management/lib/central-session/projection",
  () => ({ projectCentralManagementIdentity: vi.fn() }),
);

import { createManagementRequestContextResolver } from "../apps/vase-management/lib/central-session/request-context";
import { createManagementAppContextClient } from "../apps/vase-management/lib/central-session/app-context-client";

const centralContext = {
  globalUserId: "user_123",
  email: "owner@example.com",
  name: "Owner",
  platformRole: "USER" as const,
  globalTenantId: "tenant_123",
  tenantSlug: "norte-equipos",
  tenantName: "Norte Equipos",
  tenantRole: "OWNER" as const,
  managementRole: "ADMINISTRATOR" as const,
  entitlement: { status: "ACTIVE" as const },
  resolvedAt: "2026-08-17T20:00:00.000Z",
};

describe("Management request context resolver", () => {
  it("resolves the shared session, central context, and local projection once in order", async () => {
    const projectedUser = {
      id: "local_user_123",
      name: "Owner",
      email: "owner@example.com",
      image: null,
      isSuperAdmin: false,
      companyId: "local_company_123",
      companyName: "Norte Equipos",
      branchId: null,
      roleId: "role_admin",
      roleName: "Administrador",
    };
    const readSession = vi.fn().mockResolvedValue({
      globalUserId: "user_123",
      email: "must-not-be-forwarded@example.com",
    });
    const resolveCentralContext = vi.fn().mockResolvedValue(centralContext);
    const projectIdentity = vi.fn().mockResolvedValue(projectedUser);
    const resolver = createManagementRequestContextResolver({
      readSession,
      resolveCentralContext,
      projectIdentity,
    });

    await expect(resolver.resolve("vase.auth=session-token")).resolves.toEqual({
      central: centralContext,
      user: projectedUser,
    });
    expect(readSession).toHaveBeenCalledOnce();
    expect(readSession).toHaveBeenCalledWith("vase.auth=session-token");
    expect(resolveCentralContext).toHaveBeenCalledOnce();
    expect(resolveCentralContext).toHaveBeenCalledWith("user_123");
    expect(projectIdentity).toHaveBeenCalledOnce();
    expect(projectIdentity).toHaveBeenCalledWith(centralContext);
  });
});

describe("Management Vase App context client", () => {
  it("rejects a missing service token without fetching", async () => {
    const fetcher = vi.fn();
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal",
      serviceToken: undefined,
      fetcher,
    });

    await expect(client.resolve("user_123")).rejects.toThrow(
      "SERVICE_TOKEN_NOT_CONFIGURED",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requests and parses the strict central context", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(centralContext), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal/",
      serviceToken: "service-token",
      fetcher,
    });

    await expect(client.resolve("user id/123")).resolves.toEqual(centralContext);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      "https://app.internal/api/internal/management/session-context?userId=user+id%2F123",
      {
        headers: {
          authorization: "Bearer service-token",
          accept: "application/json",
        },
        cache: "no-store",
      },
    );
  });

  it("propagates a string central error from a non-success response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "MANAGEMENT_NOT_ENTITLED" }), {
        status: 403,
      }),
    );
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal",
      serviceToken: "service-token",
      fetcher,
    });

    await expect(client.resolve("user_123")).rejects.toThrow(
      "MANAGEMENT_NOT_ENTITLED",
    );
  });

  it.each([
    ["unreadable JSON", vi.fn().mockRejectedValue(new Error("invalid json"))],
    ["a malformed error payload", vi.fn().mockResolvedValue({ error: 503 })],
  ])("normalizes %s from a non-success response", async (_label, json) => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json });
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal",
      serviceToken: "service-token",
      fetcher,
    });

    await expect(client.resolve("user_123")).rejects.toThrow(
      "MANAGEMENT_CONTEXT_UNAVAILABLE",
    );
  });

  it("rejects a malformed successful payload through the strict schema", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...centralContext, password: "secret" }), {
        status: 200,
      }),
    );
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal",
      serviceToken: "service-token",
      fetcher,
    });

    await expect(client.resolve("user_123")).rejects.toThrow();
  });
});

describe("Management identity projection invariants", () => {
  it("does not accept a password from central context", () => {
    expect(() => managementSessionContextSchema.parse({
      ...centralContext,
      password: "must-not-cross-services",
    })).toThrow();
  });

  it("explicitly nulls the local password on create and update", () => {
    const source = readFileSync(
      new URL(
        "../apps/vase-management/lib/central-session/projection.ts",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source.match(/password:\s*null/g)).toHaveLength(2);
  });
});

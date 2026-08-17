import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { managementSessionContextSchema } from "../packages/contracts/src/index";

const boundPrisma = vi.hoisted(() => ({ $transaction: vi.fn() }));

vi.mock(
  "../apps/vase-management/lib/prisma",
  () => ({ prisma: boundPrisma }),
);

import { createManagementRequestContextResolver } from "../apps/vase-management/lib/central-session/request-context";
import { createManagementAppContextClient } from "../apps/vase-management/lib/central-session/app-context-client";
import { createCentralManagementIdentityProjector } from "../apps/vase-management/lib/central-session/projection";

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

const localUser = {
  id: "local_user_123",
  name: "Legacy Owner",
  email: "owner@example.com",
  image: null,
  password: "legacy-password-hash",
  emailVerified: null,
  isActive: false,
  isSuperAdmin: false,
  globalUserId: null as string | null,
};

function createProjectionHarness(input: {
  globalUser?: typeof localUser | null;
  emailUser?: typeof localUser | null;
  upsertUser?: typeof localUser;
  claimCount?: number;
} = {}) {
  const globalUser = input.globalUser ?? null;
  const emailUser = input.emailUser ?? null;
  const upsertUser = input.upsertUser ?? emailUser ?? localUser;
  const company = { id: "company_123", name: centralContext.tenantName };
  const role = { id: "role_123", name: "Administrador" };
  const user = {
    findUnique: vi.fn(async ({ where }) => {
      if ("globalUserId" in where) return globalUser;
      if ("email" in where) return emailUser;
      return upsertUser;
    }),
    upsert: vi.fn().mockResolvedValue(upsertUser),
    updateMany: vi.fn().mockResolvedValue({ count: input.claimCount ?? 1 }),
    update: vi.fn(async ({ data }) => ({ ...upsertUser, ...data })),
  };
  const tx = {
    company: { upsert: vi.fn().mockResolvedValue(company) },
    user,
    role: { upsert: vi.fn().mockResolvedValue(role) },
    companyUser: { upsert: vi.fn().mockResolvedValue({}) },
  };
  const db = {
    $transaction: vi.fn(async (callback) => callback(tx)),
  };

  return {
    project: createCentralManagementIdentityProjector(db as never),
    db,
    tx,
    company,
    role,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Management request context resolver", () => {
  it("passes only the shared global user and optional tenant selector to central context", async () => {
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

    await expect(
      resolver.resolve("vase.auth=session-token", "norte-equipos"),
    ).resolves.toEqual({ central: centralContext, user: projectedUser });
    expect(readSession).toHaveBeenCalledOnce();
    expect(readSession).toHaveBeenCalledWith("vase.auth=session-token");
    expect(resolveCentralContext).toHaveBeenCalledOnce();
    expect(resolveCentralContext).toHaveBeenCalledWith(
      "user_123",
      "norte-equipos",
    );
    expect(projectIdentity).toHaveBeenCalledOnce();
    expect(projectIdentity).toHaveBeenCalledWith(centralContext);
  });
});

describe("Management Vase App context client", () => {
  it.each([undefined, "", "   "])(
    "rejects missing service token %j without fetching",
    async (serviceToken) => {
      const fetcher = vi.fn();
      const client = createManagementAppContextClient({
        appInternalUrl: "https://app.internal",
        serviceToken,
        fetcher,
      });

      await expect(client.resolve("user_123")).rejects.toThrow(
        "SERVICE_TOKEN_NOT_CONFIGURED",
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([
    "not a URL",
    "ftp://app.internal",
    "https://service-user:secret@app.internal",
  ])("rejects unsafe internal URL %s without sending the token", async (appInternalUrl) => {
    const fetcher = vi.fn();
    const client = createManagementAppContextClient({
      appInternalUrl,
      serviceToken: "service-token",
      fetcher,
    });

    await expect(client.resolve("user_123")).rejects.toThrow(
      "APP_INTERNAL_URL_INVALID",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requests the selected tenant and parses the strict central context", async () => {
    const encodedIdentityContext = {
      ...centralContext,
      globalUserId: "user id/123",
    };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(encodedIdentityContext), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal/",
      serviceToken: "  service-token  ",
      fetcher,
    });

    await expect(
      client.resolve("user id/123", "norte-equipos"),
    ).resolves.toEqual(encodedIdentityContext);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      "https://app.internal/api/internal/management/session-context?userId=user+id%2F123&tenantSlug=norte-equipos",
      {
        headers: {
          authorization: "Bearer service-token",
          accept: "application/json",
        },
        cache: "no-store",
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("rejects a successful response bound to another global user", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        ...centralContext,
        globalUserId: "different_user",
      })),
    );
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal",
      serviceToken: "service-token",
      fetcher,
    });

    await expect(client.resolve("user_123")).rejects.toThrow(
      "MANAGEMENT_CONTEXT_IDENTITY_MISMATCH",
    );
  });

  it("rejects a successful response bound to another requested tenant", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(centralContext)),
    );
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal",
      serviceToken: "service-token",
      fetcher,
    });

    await expect(client.resolve("user_123", "sur-equipos")).rejects.toThrow(
      "MANAGEMENT_CONTEXT_TENANT_MISMATCH",
    );
  });

  it("normalizes fetch, DNS, TLS, and abort failures", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal",
      serviceToken: "service-token",
      fetcher,
    });

    await expect(client.resolve("user_123")).rejects.toThrow(
      "MANAGEMENT_CONTEXT_UNAVAILABLE",
    );
  });

  it("aborts a request after the configured timeout and clears the timer", async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const fetcher = vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      });
    }));
    const client = createManagementAppContextClient({
      appInternalUrl: "https://app.internal",
      serviceToken: "service-token",
      fetcher: fetcher as typeof fetch,
      timeoutMs: 25,
    });

    const resolution = client.resolve("user_123");
    const rejection = expect(resolution).rejects.toThrow(
      "MANAGEMENT_CONTEXT_UNAVAILABLE",
    );
    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
  });

  it("preserves a string central error from a non-success response", async () => {
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

describe("Management identity projection", () => {
  it("atomically claims an unbound legacy email and refreshes all local writes", async () => {
    const harness = createProjectionHarness({ emailUser: localUser });

    await expect(harness.project(centralContext)).resolves.toMatchObject({
      id: localUser.id,
      email: centralContext.email,
      companyId: harness.company.id,
      roleId: harness.role.id,
      roleName: "Administrador",
      branchId: null,
    });
    expect(harness.tx.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: centralContext.email },
      update: {},
    }));
    expect(harness.tx.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: localUser.id,
        OR: [
          { globalUserId: null },
          { globalUserId: centralContext.globalUserId },
        ],
      },
      data: { globalUserId: centralContext.globalUserId },
    });
    expect(harness.tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: localUser.id },
      data: expect.objectContaining({
        globalUserId: centralContext.globalUserId,
        email: centralContext.email,
        name: centralContext.name,
        password: null,
      }),
    }));
    expect(harness.tx.company.upsert).toHaveBeenCalledOnce();
    expect(harness.tx.role.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: "Administrador" },
    }));
    expect(harness.tx.companyUser.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { roleId: harness.role.id, isActive: true },
    }));
  });

  it.each([
    [
      "an email row bound to another central user",
      null,
      { ...localUser, globalUserId: "different_user" },
    ],
    [
      "different rows for the global ID and email",
      { ...localUser, id: "global_row", globalUserId: centralContext.globalUserId, email: "old@example.com" },
      { ...localUser, id: "email_row", globalUserId: null },
    ],
    [
      "a requested email owned by another row",
      { ...localUser, id: "global_row", globalUserId: centralContext.globalUserId, email: "old@example.com" },
      { ...localUser, id: "email_row", globalUserId: "different_user" },
    ],
  ])("rejects %s before refreshing local state", async (_label, globalUser, emailUser) => {
    const harness = createProjectionHarness({ globalUser, emailUser });

    await expect(harness.project(centralContext)).rejects.toThrow(
      "MANAGEMENT_IDENTITY_CONFLICT",
    );
    expect(harness.tx.company.upsert).not.toHaveBeenCalled();
    expect(harness.tx.user.upsert).not.toHaveBeenCalled();
    expect(harness.tx.user.update).not.toHaveBeenCalled();
  });

  it("refreshes an existing global user only when the email is unowned", async () => {
    const globalUser = {
      ...localUser,
      globalUserId: centralContext.globalUserId,
      email: "old@example.com",
    };
    const harness = createProjectionHarness({ globalUser, emailUser: null });

    await harness.project({ ...centralContext, platformRole: "SUPER_ADMIN" });

    expect(harness.tx.user.upsert).not.toHaveBeenCalled();
    expect(harness.tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: globalUser.id },
      data: expect.objectContaining({
        email: centralContext.email,
        isSuperAdmin: true,
        password: null,
      }),
    }));
  });

  it("rejects when a concurrent legacy claim loses ownership", async () => {
    const harness = createProjectionHarness({
      emailUser: localUser,
      claimCount: 0,
    });

    await expect(harness.project(centralContext)).rejects.toThrow(
      "MANAGEMENT_IDENTITY_CONFLICT",
    );
    expect(harness.tx.user.update).not.toHaveBeenCalled();
  });

  it("converges concurrent first projections through atomic email upsert", async () => {
    let storedUser: typeof localUser | null = null;
    const company = { id: "company_123", name: centralContext.tenantName };
    const role = { id: "role_123", name: "Administrador" };
    const user = {
      findUnique: vi.fn(async ({ where }) => {
        if ("globalUserId" in where) {
          return storedUser?.globalUserId === where.globalUserId ? storedUser : null;
        }
        return storedUser?.email === where.email ? storedUser : null;
      }),
      upsert: vi.fn(async ({ create }) => {
        storedUser ??= { ...localUser, ...create };
        return storedUser;
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(async ({ data }) => {
        storedUser = { ...storedUser!, ...data };
        return storedUser;
      }),
    };
    const tx = {
      company: { upsert: vi.fn().mockResolvedValue(company) },
      user,
      role: { upsert: vi.fn().mockResolvedValue(role) },
      companyUser: { upsert: vi.fn().mockResolvedValue({}) },
    };
    const db = { $transaction: vi.fn(async (callback) => callback(tx)) };
    const project = createCentralManagementIdentityProjector(db as never);

    const [first, second] = await Promise.all([
      project(centralContext),
      project(centralContext),
    ]);

    expect(first.id).toBe(localUser.id);
    expect(second.id).toBe(localUser.id);
    expect(user.upsert).toHaveBeenCalledTimes(2);
    expect(storedUser?.globalUserId).toBe(centralContext.globalUserId);
  });
});

describe("Management identity projection invariants", () => {
  it("does not accept a password from central context", () => {
    expect(() => managementSessionContextSchema.parse({
      ...centralContext,
      password: "must-not-cross-services",
    })).toThrow();
  });

  it("explicitly nulls the local password in the profile refresh", () => {
    const source = readFileSync(
      new URL(
        "../apps/vase-management/lib/central-session/projection.ts",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toMatch(/password:\s*null/);
  });
});

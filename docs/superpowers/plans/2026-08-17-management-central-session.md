# Management Central Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Vase Management consume the central Vase App session and authorization context so users sign in once while Management keeps its operational PostgreSQL database.

**Architecture:** Management will decode the shared `.vase.ar` Auth.js cookie with the same `AUTH_SECRET`, then ask a service-token-protected Vase App endpoint for current tenant and Management entitlement. A compatibility `auth()` facade will preserve the existing Management route API while returning a locally projected user/company derived from central identity rather than a Management password.

**Tech Stack:** Next.js App Router, Auth.js JWT cookies, TypeScript, Zod, Prisma (MySQL in Vase App and PostgreSQL in Management), Vitest.

---

## File Map

- Create `apps/vase-app/src/server/services/management-session-context.ts`: central authorization rules behind a repository interface.
- Create `apps/vase-app/src/app/api/internal/management/session-context/route.ts`: service-token-protected context endpoint.
- Modify `packages/contracts/src/index.ts`: strict Management context schema and exported type.
- Create `apps/vase-management/lib/central-session/shared-session.ts`: shared cookie decoder.
- Create `apps/vase-management/lib/central-session/app-context-client.ts`: typed client for Vase App context.
- Create `apps/vase-management/lib/central-session/projection.ts`: idempotent local user/company projection.
- Create `apps/vase-management/lib/central-session/request-context.ts`: compose cookie, context API, and projection.
- Modify `apps/vase-management/lib/auth.ts`: preserve the existing `auth()` call shape while using central context.
- Modify `apps/vase-management/middleware.ts`: stop checking a second local NextAuth session.
- Modify `apps/vase-management/app/auth/login/page.tsx`: redirect to central sign-in.
- Create `apps/vase-app/src/app/api/auth/central-logout/route.ts`: clear the shared session through Vase App.
- Modify `apps/vase-management/components/layout/Header.tsx`: send logout to the central endpoint.
- Modify environment examples and deployment documentation.
- Create focused root Vitest suites for each boundary.

### Task 1: Define the central Management context contract

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Create: `tests/v3-management-session-contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from "vitest";
import { managementSessionContextSchema } from "../packages/contracts/src/index";

const validContext = {
  globalUserId: "user_123",
  email: "owner@example.com",
  name: "Owner",
  platformRole: "USER",
  globalTenantId: "tenant_123",
  tenantSlug: "norte-equipos",
  tenantName: "Norte Equipos",
  tenantRole: "OWNER",
  managementRole: "ADMINISTRATOR",
  entitlement: { status: "ACTIVE" },
  resolvedAt: "2026-08-17T20:00:00.000Z",
};

describe("Management session context contract", () => {
  it("accepts the allowlisted central identity payload", () => {
    expect(managementSessionContextSchema.parse(validContext)).toEqual(validContext);
  });

  it("rejects secrets and unsupported roles", () => {
    expect(() => managementSessionContextSchema.parse({
      ...validContext,
      managementRole: "SUPERUSER",
    })).toThrow();
    expect(() => managementSessionContextSchema.parse({
      ...validContext,
      passwordHash: "must-not-cross-services",
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-session-contract.test.ts
```

Expected: FAIL because `managementSessionContextSchema` is not exported.

- [ ] **Step 3: Add the strict schema and type export**

Add beside the existing Labs session contract in `packages/contracts/src/index.ts`:

```ts
export const managementSessionContextSchema = z.object({
  globalUserId: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  platformRole: z.enum(["SUPER_ADMIN", "SUPPORT", "DEVELOPER", "USER"]),
  globalTenantId: z.string().min(1),
  tenantSlug: z.string().min(1),
  tenantName: z.string().min(1),
  tenantRole: z.enum(["OWNER", "MANAGER", "MEMBER"]),
  managementRole: z.enum(["ADMINISTRATOR", "MEMBER"]),
  entitlement: z.object({
    status: z.enum(["ACTIVE", "TRIAL"]),
  }).strict(),
  resolvedAt: z.iso.datetime(),
}).strict();
```

Add with the other inferred exports:

```ts
export type ManagementSessionContext = z.infer<typeof managementSessionContextSchema>;
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the Step 2 command. Expected: `2 passed`.

- [ ] **Step 5: Commit the contract**

```powershell
git add packages/contracts/src/index.ts tests/v3-management-session-contract.test.ts
git commit -m "feat(auth): define management session context"
```

### Task 2: Expose authoritative Management context from Vase App

**Files:**
- Create: `apps/vase-app/src/server/services/management-session-context.ts`
- Create: `apps/vase-app/src/app/api/internal/management/session-context/route.ts`
- Create: `tests/v3-management-session-context.test.ts`

- [ ] **Step 1: Write failing service tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { createManagementSessionContextService } from "../apps/vase-app/src/server/services/management-session-context";

const membership = {
  globalUserId: "user_123",
  email: "owner@example.com",
  name: "Owner",
  platformRole: "USER" as const,
  globalTenantId: "tenant_123",
  tenantSlug: "norte-equipos",
  tenantName: "Norte Equipos",
  tenantRole: "OWNER" as const,
  moduleStatus: "ACTIVE" as const,
  userModuleActive: true,
  identityLinkActive: true,
  identityLinkRole: "OWNER",
};

describe("Management session context service", () => {
  it("maps central membership into Management authorization", async () => {
    const service = createManagementSessionContextService({
      findAccess: vi.fn().mockResolvedValue(membership),
      now: () => new Date("2026-08-17T20:00:00.000Z"),
    });
    await expect(service.resolve({ globalUserId: "user_123" })).resolves.toMatchObject({
      globalTenantId: "tenant_123",
      tenantRole: "OWNER",
      managementRole: "ADMINISTRATOR",
      entitlement: { status: "ACTIVE" },
    });
  });

  it("rejects missing, suspended, or explicitly disabled access", async () => {
    for (const access of [
      null,
      { ...membership, moduleStatus: "SUSPENDED" as const },
      { ...membership, userModuleActive: false },
      { ...membership, identityLinkActive: false },
    ]) {
      const service = createManagementSessionContextService({
        findAccess: vi.fn().mockResolvedValue(access),
      });
      await expect(service.resolve({ globalUserId: "user_123" })).rejects.toThrow("MANAGEMENT_NOT_ENTITLED");
    }
  });
});
```

- [ ] **Step 2: Run the service test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-session-context.test.ts
```

Expected: FAIL because the service module does not exist.

- [ ] **Step 3: Implement the pure authorization service**

Create `apps/vase-app/src/server/services/management-session-context.ts`:

```ts
import { managementSessionContextSchema } from "@vase/contracts";

export type ManagementAccessRecord = {
  globalUserId: string;
  email: string;
  name: string;
  platformRole: "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" | "USER";
  globalTenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantRole: "OWNER" | "MANAGER" | "MEMBER";
  moduleStatus: "ACTIVE" | "TRIAL" | "SUSPENDED";
  userModuleActive: boolean | null;
  identityLinkActive: boolean | null;
  identityLinkRole: string | null;
};

export interface ManagementSessionContextRepository {
  findAccess(globalUserId: string, requestedTenantSlug?: string): Promise<ManagementAccessRecord | null>;
}

export function createManagementSessionContextService(
  repository: ManagementSessionContextRepository & { now?: () => Date },
) {
  return {
    async resolve(input: { globalUserId: string; requestedTenantSlug?: string }) {
      const access = await repository.findAccess(input.globalUserId, input.requestedTenantSlug);
      if (
        !access ||
        !["ACTIVE", "TRIAL"].includes(access.moduleStatus) ||
        access.userModuleActive === false ||
        access.identityLinkActive === false
      ) {
        throw new Error("MANAGEMENT_NOT_ENTITLED");
      }
      return managementSessionContextSchema.parse({
        globalUserId: access.globalUserId,
        email: access.email,
        name: access.name,
        platformRole: access.platformRole,
        globalTenantId: access.globalTenantId,
        tenantSlug: access.tenantSlug,
        tenantName: access.tenantName,
        tenantRole: access.tenantRole,
      managementRole:
        access.identityLinkRole === "MEMBER" || access.tenantRole === "MEMBER"
          ? "MEMBER"
          : "ADMINISTRATOR",
        entitlement: { status: access.moduleStatus },
        resolvedAt: (repository.now?.() ?? new Date()).toISOString(),
      });
    },
  };
}
```

- [ ] **Step 4: Add the protected route with a Prisma repository**

Create `apps/vase-app/src/app/api/internal/management/session-context/route.ts` with a repository that queries active membership, user, `vase_management` tenant module, user module access, and identity link. Normalize absent user/link rows to `null`, then call the service:

```ts
import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createManagementSessionContextService } from "@/server/services/management-session-context";

const service = createManagementSessionContextService({
  async findAccess(globalUserId, requestedTenantSlug) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: globalUserId,
        status: "ACTIVE",
        user: { isDisabled: false, emailVerified: { not: null } },
        tenant: {
          ...(requestedTenantSlug ? { slug: requestedTenantSlug } : {}),
          status: { in: ["ACTIVE", "TRIAL"] },
          tenantModules: {
            some: {
              moduleId: "vase_management",
              isActive: true,
              commercialStatus: { in: ["ACTIVE", "TRIAL"] },
            },
          },
        },
      },
      include: {
        user: { include: { moduleAccesses: { where: { moduleId: "vase_management" } } } },
        tenant: {
          include: {
            tenantModules: { where: { moduleId: "vase_management" } },
            managementIdentityLinks: { where: { userId: globalUserId } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!membership) return null;
    const moduleAccess = membership.tenant.tenantModules[0];
    const userAccess = membership.user.moduleAccesses[0];
    const identityLink = membership.tenant.managementIdentityLinks[0];
    return {
      globalUserId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      platformRole: membership.user.platformRole,
      globalTenantId: membership.tenant.id,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      tenantRole: membership.role,
      moduleStatus:
        moduleAccess.commercialStatus === "TRIAL"
          ? "TRIAL"
          : moduleAccess.commercialStatus === "ACTIVE"
            ? "ACTIVE"
            : "SUSPENDED",
      userModuleActive: userAccess?.isActive ?? null,
      identityLinkActive: identityLink?.isActive ?? null,
      identityLinkRole: identityLink?.managementRole ?? null,
    };
  },
});

export async function GET(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
    const url = new URL(request.url);
    const globalUserId = url.searchParams.get("userId")?.trim();
    if (!globalUserId) return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    const payload = await service.resolve({
      globalUserId,
      requestedTenantSlug: url.searchParams.get("tenantSlug")?.trim() || undefined,
    });
    return NextResponse.json(payload);
  } catch (error) {
    const code = error instanceof Error ? error.message : "MANAGEMENT_CONTEXT_FAILED";
    const status = code === "FORBIDDEN" || code === "MANAGEMENT_NOT_ENTITLED" ? 403 : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
```

- [ ] **Step 5: Run focused tests and commit**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-session-contract.test.ts tests/v3-management-session-context.test.ts
git add apps/vase-app/src/server/services/management-session-context.ts apps/vase-app/src/app/api/internal/management/session-context/route.ts tests/v3-management-session-context.test.ts
git commit -m "feat(app): expose management session context"
```

Expected: all focused tests pass.

### Task 3: Decode the shared Vase session in Management

**Files:**
- Create: `apps/vase-management/lib/central-session/shared-session.ts`
- Create: `tests/v3-management-shared-session.test.ts`

- [ ] **Step 1: Write failing cookie tests**

```ts
import { encode } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import { sharedAuthCookieName } from "@vase/auth";
import { readSharedManagementSession } from "../apps/vase-management/lib/central-session/shared-session";

const secret = "shared-auth-secret-with-at-least-32-characters";

describe("Management shared session", () => {
  it("reads the central Auth.js subject", async () => {
    const token = await encode({
      token: { sub: "user_123", email: "owner@example.com", sessionExpiresAt: Date.now() + 60_000 },
      secret,
      salt: sharedAuthCookieName,
    });
    await expect(readSharedManagementSession({
      cookieHeader: `${sharedAuthCookieName}=${encodeURIComponent(token)}`,
      secret,
    })).resolves.toMatchObject({ globalUserId: "user_123", email: "owner@example.com" });
  });

  it("rejects missing and expired sessions", async () => {
    await expect(readSharedManagementSession({ cookieHeader: null, secret })).rejects.toThrow("MANAGEMENT_SESSION_REQUIRED");
    const expired = await encode({
      token: { sub: "user_123", sessionExpiresAt: Date.now() - 1 },
      secret,
      salt: sharedAuthCookieName,
    });
    await expect(readSharedManagementSession({
      cookieHeader: `${sharedAuthCookieName}=${encodeURIComponent(expired)}`,
      secret,
    })).rejects.toThrow("MANAGEMENT_SESSION_EXPIRED");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-shared-session.test.ts
```

Expected: FAIL because the reader does not exist.

- [ ] **Step 3: Implement the reader using the Labs cookie rules**

Create `apps/vase-management/lib/central-session/shared-session.ts`:

```ts
import { decode } from "next-auth/jwt";
import { getCookieValue, localAuthCookieName, sharedAuthCookieName } from "@vase/auth";

export async function readSharedManagementSession(input: {
  cookieHeader: string | null;
  secret: string | undefined;
  now?: number;
}) {
  if (!input.secret) throw new Error("MANAGEMENT_AUTH_SECRET_MISSING");
  const cookieName = getCookieValue(input.cookieHeader, sharedAuthCookieName)
    ? sharedAuthCookieName
    : localAuthCookieName;
  const encryptedToken = getCookieValue(input.cookieHeader, cookieName);
  if (!encryptedToken) throw new Error("MANAGEMENT_SESSION_REQUIRED");
  const token = await decode({ token: encryptedToken, secret: input.secret, salt: cookieName });
  if (!token?.sub) throw new Error("MANAGEMENT_SESSION_INVALID");
  const sessionExpiresAt = typeof token.sessionExpiresAt === "number" ? token.sessionExpiresAt : undefined;
  if (sessionExpiresAt !== undefined && sessionExpiresAt <= (input.now ?? Date.now())) {
    throw new Error("MANAGEMENT_SESSION_EXPIRED");
  }
  return {
    globalUserId: token.sub,
    email: typeof token.email === "string" ? token.email : "",
    sessionExpiresAt,
  };
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-shared-session.test.ts
git add apps/vase-management/lib/central-session/shared-session.ts tests/v3-management-shared-session.test.ts
git commit -m "feat(management): read shared vase session"
```

Expected: `2 passed`.

### Task 4: Resolve and project central context in Management

**Files:**
- Create: `apps/vase-management/lib/central-session/app-context-client.ts`
- Create: `apps/vase-management/lib/central-session/projection.ts`
- Create: `apps/vase-management/lib/central-session/request-context.ts`
- Create: `tests/v3-management-request-context.test.ts`

- [ ] **Step 1: Write failing composition tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { createManagementRequestContextResolver } from "../apps/vase-management/lib/central-session/request-context";

const central = {
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

describe("Management request context", () => {
  it("composes shared identity, central authorization, and local projection", async () => {
    const resolver = createManagementRequestContextResolver({
      readSession: vi.fn().mockResolvedValue({ globalUserId: "user_123", email: "owner@example.com" }),
      resolveCentralContext: vi.fn().mockResolvedValue(central),
      projectIdentity: vi.fn().mockResolvedValue({
        id: "local_user", name: "Owner", email: "owner@example.com", isSuperAdmin: false,
        companyId: "local_company", companyName: "Norte Equipos", branchId: null,
        roleId: "local_role", roleName: "Administrador",
      }),
    });
    await expect(resolver.resolve("cookie=value")).resolves.toMatchObject({
      central,
      user: { id: "local_user", companyId: "local_company" },
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-request-context.test.ts
```

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement the typed Vase App client**

Create `apps/vase-management/lib/central-session/app-context-client.ts`:

```ts
import { managementSessionContextSchema } from "@vase/contracts";

export function createManagementAppContextClient(input: {
  appInternalUrl: string;
  serviceToken: string | undefined;
  fetcher?: typeof fetch;
}) {
  return {
    async resolve(globalUserId: string) {
      if (!input.serviceToken) throw new Error("SERVICE_TOKEN_NOT_CONFIGURED");
      const url = new URL("/api/internal/management/session-context", input.appInternalUrl);
      url.searchParams.set("userId", globalUserId);
      const response = await (input.fetcher ?? fetch)(url, {
        headers: { authorization: `Bearer ${input.serviceToken}`, accept: "application/json" },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "MANAGEMENT_CONTEXT_UNAVAILABLE");
      }
      return managementSessionContextSchema.parse(payload);
    },
  };
}
```

- [ ] **Step 4: Refactor local provisioning into an idempotent projection**

Create `apps/vase-management/lib/central-session/projection.ts`. Reuse the company, user, role, and `CompanyUser` upserts from `lib/platform-sso.ts`, but accept `ManagementSessionContext`, do not create a nonce, never write a password, and set `isSuperAdmin` from `platformRole === "SUPER_ADMIN"`. Export:

```ts
import type { ManagementSessionContext } from "@vase/contracts";
import { prisma } from "@/lib/prisma";

export async function projectCentralManagementIdentity(context: ManagementSessionContext) {
  return prisma.$transaction(async (tx) => {
    const company = await tx.company.upsert({
      where: { globalTenantId: context.globalTenantId },
      update: { name: context.tenantName, isActive: true, provisioningStatus: "READY" },
      create: {
        globalTenantId: context.globalTenantId,
        name: context.tenantName,
        email: context.email,
        isActive: true,
        provisioningStatus: "READY",
      },
    });
    const existing = await tx.user.findFirst({
      where: { OR: [{ globalUserId: context.globalUserId }, { email: context.email.toLowerCase() }] },
    });
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            globalUserId: context.globalUserId,
            name: context.name,
            email: context.email.toLowerCase(),
            emailVerified: existing.emailVerified ?? new Date(),
            isActive: true,
            isSuperAdmin: context.platformRole === "SUPER_ADMIN",
            password: null,
          },
        })
      : await tx.user.create({
          data: {
            globalUserId: context.globalUserId,
            email: context.email.toLowerCase(),
            name: context.name,
            emailVerified: new Date(),
            isActive: true,
            isSuperAdmin: context.platformRole === "SUPER_ADMIN",
            password: null,
          },
        });
    const roleName = context.managementRole === "ADMINISTRATOR" ? "Administrador" : "Vendedor";
    const role = await tx.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: roleName, isSystem: true },
    });
    await tx.companyUser.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      update: { roleId: role.id, isActive: true },
      create: { companyId: company.id, userId: user.id, roleId: role.id, isActive: true },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      isSuperAdmin: user.isSuperAdmin,
      companyId: company.id,
      companyName: company.name,
      branchId: null,
      roleId: role.id,
      roleName: role.name,
    };
  });
}
```

- [ ] **Step 5: Implement the composition boundary**

Create `apps/vase-management/lib/central-session/request-context.ts`:

```ts
import type { ManagementSessionContext } from "@vase/contracts";
import { createManagementAppContextClient } from "./app-context-client";
import { projectCentralManagementIdentity } from "./projection";
import { readSharedManagementSession } from "./shared-session";

type ProjectedUser = Awaited<ReturnType<typeof projectCentralManagementIdentity>>;

export function createManagementRequestContextResolver(input: {
  readSession: (cookieHeader: string | null) => Promise<{ globalUserId: string }>;
  resolveCentralContext: (globalUserId: string) => Promise<ManagementSessionContext>;
  projectIdentity: (context: ManagementSessionContext) => Promise<ProjectedUser>;
}) {
  return {
    async resolve(cookieHeader: string | null) {
      const session = await input.readSession(cookieHeader);
      const central = await input.resolveCentralContext(session.globalUserId);
      const user = await input.projectIdentity(central);
      return { central, user };
    },
  };
}

const appClient = createManagementAppContextClient({
  appInternalUrl: process.env.APP_INTERNAL_URL ?? "https://app.vase.ar",
  serviceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
});

export const managementRequestContext = createManagementRequestContextResolver({
  readSession: (cookieHeader) => readSharedManagementSession({ cookieHeader, secret: process.env.AUTH_SECRET }),
  resolveCentralContext: (globalUserId) => appClient.resolve(globalUserId),
  projectIdentity: projectCentralManagementIdentity,
});
```

- [ ] **Step 6: Run focused tests and commit**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-request-context.test.ts tests/v3-management-shared-session.test.ts
git add apps/vase-management/lib/central-session tests/v3-management-request-context.test.ts
git commit -m "feat(management): resolve central request context"
```

Expected: all focused tests pass.

### Task 5: Preserve the Management `auth()` API while switching its source

**Files:**
- Create: `apps/vase-management/lib/legacy-auth.ts` from the current `lib/auth.ts`
- Modify: `apps/vase-management/lib/auth.ts`
- Modify: `apps/vase-management/app/api/auth/[...nextauth]/route.ts`
- Modify: `apps/vase-management/app/dashboard/layout.tsx`
- Create: `tests/v3-management-auth-facade.test.ts`

- [ ] **Step 1: Write a failing source-of-truth regression test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Management auth facade", () => {
  it("uses central request context instead of Management passwords", () => {
    const source = readFileSync(resolve(process.cwd(), "apps/vase-management/lib/auth.ts"), "utf8");
    expect(source).toContain("managementRequestContext.resolve");
    expect(source).not.toContain("bcrypt.compare");
    expect(source).not.toContain("Credentials(");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-auth-facade.test.ts
```

Expected: FAIL because `lib/auth.ts` still verifies local credentials.

- [ ] **Step 3: Isolate the temporary legacy route, then replace `lib/auth.ts` with the compatibility facade**

First copy the current contents of `apps/vase-management/lib/auth.ts` into
`apps/vase-management/lib/legacy-auth.ts`. This keeps the temporary Auth.js route
buildable without allowing the rest of Management to import the old password
provider. Then change `apps/vase-management/app/api/auth/[...nextauth]/route.ts`
to:

```ts
import { handlers } from "@/lib/legacy-auth";

export const { GET, POST } = handlers;
```

Replace `apps/vase-management/lib/auth.ts` with the central compatibility facade:

```ts
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { managementRequestContext } from "@/lib/central-session/request-context";

const unauthenticatedCodes = new Set([
  "MANAGEMENT_SESSION_REQUIRED",
  "MANAGEMENT_SESSION_INVALID",
  "MANAGEMENT_SESSION_EXPIRED",
  "MANAGEMENT_NOT_ENTITLED",
]);

export async function auth() {
  noStore();
  try {
    const requestHeaders = headers();
    const context = await managementRequestContext.resolve(requestHeaders.get("cookie"));
    return { user: context.user, central: context.central };
  } catch (error) {
    if (error instanceof Error && unauthenticatedCodes.has(error.message)) return null;
    throw error;
  }
}
```

Keep that isolated legacy route only until the central path is verified in production;
it will no longer be referenced by the Management UI or central `auth()` facade.

- [ ] **Step 4: Make dashboard redirects central and allowlisted**

In `apps/vase-management/app/dashboard/layout.tsx`, replace the local redirect with:

```ts
if (!session?.user) {
  const appUrl = process.env.VASE_APP_PUBLIC_URL ?? "https://app.vase.ar";
  const managementUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://management.vase.ar";
  const signInUrl = new URL("/signin", appUrl);
  signInUrl.searchParams.set("redirectTo", new URL("/dashboard", managementUrl).toString());
  redirect(signInUrl.toString());
}
```

- [ ] **Step 5: Run focused tests and commit**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-auth-facade.test.ts tests/v3-management-request-context.test.ts
git add apps/vase-management/lib/auth.ts apps/vase-management/lib/legacy-auth.ts apps/vase-management/app/api/auth/[...nextauth]/route.ts apps/vase-management/app/dashboard/layout.tsx tests/v3-management-auth-facade.test.ts
git commit -m "refactor(management): source auth from vase app"
```

Expected: focused tests pass and existing API imports continue to compile against `auth()`.

### Task 6: Remove the user-facing local login and centralize logout

**Files:**
- Modify: `apps/vase-management/middleware.ts`
- Replace: `apps/vase-management/app/auth/login/page.tsx`
- Modify: `apps/vase-management/components/layout/Header.tsx`
- Create: `apps/vase-app/src/app/api/auth/central-logout/route.ts`
- Create: `tests/v3-management-central-navigation.test.ts`

- [ ] **Step 1: Write failing navigation tests**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Management central navigation", () => {
  it("redirects local login to Vase App and removes demo credentials", () => {
    const login = source("apps/vase-management/app/auth/login/page.tsx");
    expect(login).toContain("VASE_APP_PUBLIC_URL");
    expect(login).not.toContain("admin@demo.com");
    expect(login).not.toContain("signIn('credentials'");
  });

  it("routes logout through Vase App", () => {
    const header = source("apps/vase-management/components/layout/Header.tsx");
    expect(header).toContain("/api/auth/central-logout");
    expect(header).not.toContain("next-auth/react");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-central-navigation.test.ts
```

Expected: FAIL on the local credentials and local `signOut` calls.

- [ ] **Step 3: Replace the Management login page with a server redirect**

```ts
import { redirect } from "next/navigation";

export default function ManagementLoginPage() {
  const appUrl = process.env.VASE_APP_PUBLIC_URL ?? "https://app.vase.ar";
  const managementUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://management.vase.ar";
  const signInUrl = new URL("/signin", appUrl);
  signInUrl.searchParams.set("redirectTo", new URL("/dashboard", managementUrl).toString());
  redirect(signInUrl.toString());
}
```

- [ ] **Step 4: Limit middleware to page routing without a local NextAuth session**

Replace `apps/vase-management/middleware.ts` with:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getCookieValue, localAuthCookieName, sharedAuthCookieName } from "@vase/auth";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/auth/login" || pathname === "/auth/register" || pathname === "/auth/forgot-password") {
    return NextResponse.next();
  }
  const cookieHeader = request.headers.get("cookie");
  const hasSession = Boolean(
    getCookieValue(cookieHeader, sharedAuthCookieName) || getCookieValue(cookieHeader, localAuthCookieName),
  );
  if (!hasSession) {
    const appUrl = process.env.VASE_APP_PUBLIC_URL ?? "https://app.vase.ar";
    const signInUrl = new URL("/signin", appUrl);
    signInUrl.searchParams.set("redirectTo", request.nextUrl.toString());
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
```

Dashboard layout remains the authoritative decoder and entitlement check; middleware only avoids rendering protected pages without any session cookie.

- [ ] **Step 5: Add central logout and update the Header**

Create `apps/vase-app/src/app/api/auth/central-logout/route.ts`:

```ts
import { signOut } from "@/auth";

export async function GET() {
  await signOut({ redirectTo: "/signin" });
}
```

In `Header.tsx`, remove `next-auth/react` and replace `handleSignOut` with:

```ts
function handleSignOut() {
  const appUrl = process.env.NEXT_PUBLIC_VASE_APP_URL ?? "https://app.vase.ar";
  window.location.assign(new URL("/api/auth/central-logout", appUrl).toString());
}
```

- [ ] **Step 6: Run focused tests and commit**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-central-navigation.test.ts tests/v3-management-auth-facade.test.ts
git add apps/vase-management/middleware.ts apps/vase-management/app/auth/login/page.tsx apps/vase-management/components/layout/Header.tsx apps/vase-app/src/app/api/auth/central-logout/route.ts tests/v3-management-central-navigation.test.ts
git commit -m "feat(auth): centralize management login and logout"
```

Expected: all navigation tests pass.

### Task 7: Align environment, deployment docs, and verification

**Files:**
- Modify: `apps/vase-app/.env.example`
- Modify: `apps/vase-management/.env.example`
- Modify: `apps/vase-management/README.md`
- Modify: `apps/vase-management/Dockerfile`
- Verify: all files changed in Tasks 1-6

- [ ] **Step 1: Document the exact shared environment contract**

Add to `apps/vase-app/.env.example`:

```env
AUTH_COOKIE_DOMAIN=.vase.ar
AUTH_SECRET=
SERVICE_TO_SERVICE_TOKEN=
```

Add or replace in `apps/vase-management/.env.example`:

```env
AUTH_SECRET=
APP_INTERNAL_URL=http://vase-app:3002
VASE_APP_PUBLIC_URL=https://app.vase.ar
NEXT_PUBLIC_VASE_APP_URL=https://app.vase.ar
NEXT_PUBLIC_APP_URL=https://management.vase.ar
SERVICE_TO_SERVICE_TOKEN=
```

Generate each secret outside the repository and copy the same generated value to
the corresponding variable in both EasyPanel services:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Remove demo login instructions from the Management README and document that users enter from Vase App or any Management URL with the shared cookie.

- [ ] **Step 2: Pass non-secret URL arguments through the Management image**

Add these build arguments and environment assignments to `apps/vase-management/Dockerfile` beside the existing URL arguments:

```dockerfile
ARG VASE_APP_PUBLIC_URL=https://app.vase.ar
ARG NEXT_PUBLIC_VASE_APP_URL=https://app.vase.ar
ENV VASE_APP_PUBLIC_URL=$VASE_APP_PUBLIC_URL
ENV NEXT_PUBLIC_VASE_APP_URL=$NEXT_PUBLIC_VASE_APP_URL
```

Secrets remain runtime-only EasyPanel variables and must not be Docker build arguments.

- [ ] **Step 3: Run all focused central-session suites**

```powershell
node node_modules/vitest/vitest.mjs run tests/v3-management-session-contract.test.ts tests/v3-management-session-context.test.ts tests/v3-management-shared-session.test.ts tests/v3-management-request-context.test.ts tests/v3-management-auth-facade.test.ts tests/v3-management-central-navigation.test.ts tests/v3-management-sso.test.ts tests/v3-management-module.test.ts tests/v3-management-links.test.ts
```

Expected: all files pass with no failed tests.

- [ ] **Step 4: Regenerate Prisma and type-check both applications**

```powershell
npx prisma generate --schema apps/vase-app/prisma/schema.prisma
npx prisma generate --schema apps/vase-management/prisma/schema.prisma
npm run typecheck --workspace @vase/app
npx tsc --noEmit -p apps/vase-management/tsconfig.json --pretty false
```

Target: both type checks exit `0`. If baseline errors remain after regenerating
both Prisma clients, capture the exact files and errors before continuing; no
changed central-session file may appear in that output.

- [ ] **Step 5: Build both applications**

```powershell
npm run build --workspace @vase/app
npm run build --workspace @vase/management
```

Expected: both builds exit `0`.

- [ ] **Step 6: Perform local HTTP verification**

Start Vase App and Management in separate PowerShell windows:

```powershell
npm run dev:v3:app
```

```powershell
npm run dev:v3:management
```

Verify:

```powershell
@'
const targets = [
  "http://127.0.0.1:3002/signin",
  "http://127.0.0.1:3006/auth/login",
  "http://127.0.0.1:3006/dashboard",
];
for (const url of targets) {
  const response = await fetch(url, { redirect: "manual" });
  console.log(JSON.stringify({ url, status: response.status, location: response.headers.get("location") }));
}
'@ | node -
```

Expected without a cookie: Vase App sign-in returns `200`; Management login and dashboard redirect to Vase App sign-in and never to localhost in production configuration.

- [ ] **Step 7: Commit deployment alignment**

```powershell
git add apps/vase-app/.env.example apps/vase-management/.env.example apps/vase-management/README.md apps/vase-management/Dockerfile
git commit -m "docs(auth): align central management deployment"
```

### Task 8: Production rollout and deferred legacy removal

**Files:**
- Verify: EasyPanel environment for Vase App and Management
- Verify: production routes and shared cookie behavior
- Deferred removal after successful production verification: `apps/vase-management/app/auth/sso/page.tsx`, `apps/vase-management/app/api/auth/[...nextauth]/route.ts`, `apps/vase-management/lib/legacy-auth.ts`, `apps/vase-management/lib/auth.config.ts`, `ManagementSsoNonce` schema and migrations

- [ ] **Step 1: Configure matching runtime secrets**

Set the same `AUTH_SECRET` and `SERVICE_TO_SERVICE_TOKEN` in both EasyPanel services. Set `AUTH_COOKIE_DOMAIN=.vase.ar` in Vase App, `APP_INTERNAL_URL` to the reachable Vase App service, and public URLs to their HTTPS domains. Do not print secret values in build logs or commits.

- [ ] **Step 2: Deploy Vase App first**

Confirm:

```text
https://app.vase.ar/signin -> 200
https://app.vase.ar/api/health/ready -> 200
```

Sign in and confirm the browser stores `__Secure-authjs.session-token` for `.vase.ar`.

- [ ] **Step 3: Deploy Management second**

Open `https://management.vase.ar/dashboard` in the already authenticated browser. Expected: dashboard opens without a Management credentials form and shows the central tenant.

- [ ] **Step 4: Verify authorization revocation**

Disable the user's `vase_management` access in Vase App, refresh Management, and confirm access is denied on the next request. Re-enable access and confirm the dashboard returns.

- [ ] **Step 5: Verify central logout**

Use “Cerrar sesión” in Management. Expected: the shared cookie is cleared by Vase App and both `app.vase.ar/app` and `management.vase.ar/dashboard` require sign-in.

- [ ] **Step 6: Schedule legacy SSO removal as a separate reviewed commit**

After production verification, remove the unreachable ticket SSO route, local NextAuth handler/configuration, credentials dependencies, and nonce model in a dedicated migration. Run the same focused suites and both builds before committing that irreversible cleanup.

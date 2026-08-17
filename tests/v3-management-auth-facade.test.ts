import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "../apps/vase-management/lib/central-session/request-context",
  () => ({
    managementRequestContext: { resolve: vi.fn() },
  }),
);

const authPath = new URL(
  "../apps/vase-management/lib/auth.ts",
  import.meta.url,
);
const legacyAuthPath = new URL(
  "../apps/vase-management/lib/legacy-auth.ts",
  import.meta.url,
);
const authRoutePath = new URL(
  "../apps/vase-management/app/api/auth/[...nextauth]/route.ts",
  import.meta.url,
);
const dashboardLayoutPath = new URL(
  "../apps/vase-management/app/dashboard/layout.tsx",
  import.meta.url,
);

async function loadManagementAuthFacade() {
  const source = readFileSync(authPath, "utf8");
  expect(source).toContain("export function createManagementAuthFacade");

  return import("../apps/vase-management/lib/auth");
}

describe("Management auth facade source boundaries", () => {
  it("uses the central request context without retaining the legacy Auth.js setup", () => {
    const source = readFileSync(authPath, "utf8");

    expect(source).toContain("managementRequestContext.resolve");
    expect(source).toContain("export async function auth()");
    expect(source).not.toMatch(/bcrypt/i);
    expect(source).not.toMatch(/Credentials\s*\(/);
    expect(source).not.toMatch(/PrismaAdapter/);
    expect(source).not.toMatch(/password/);
    expect(source).not.toMatch(/NextAuth\s*\(/);
    expect(source).not.toMatch(/export const \{[^}]*handlers/);
    expect(source).not.toMatch(/export const \{[^}]*signIn/);
    expect(source).not.toMatch(/export const \{[^}]*signOut/);
  });

  it("isolates the former Auth.js setup behind the temporary API route", () => {
    const legacySource = readFileSync(legacyAuthPath, "utf8");
    const routeSource = readFileSync(authRoutePath, "utf8");

    expect(routeSource).toMatch(
      /import \{ handlers \} from ["']@\/lib\/legacy-auth["']/,
    );
    expect(routeSource).not.toMatch(/from ["']@\/lib\/auth["']/);
    expect(legacySource).toContain("NextAuth({");
    expect(legacySource).toContain("PrismaAdapter(prisma)");
    expect(legacySource).toContain("bcrypt.compare(password, user.password)");
    expect(legacySource).toContain("export const { handlers, signIn, signOut }");
  });

  it("keeps the existing zero-argument auth export for all consumers", () => {
    const source = readFileSync(authPath, "utf8");

    expect(source).toMatch(/export async function auth\(\)/);
  });
});

describe("createManagementAuthFacade", () => {
  const context = {
    user: { id: "local_user_123", email: "owner@example.com" },
    central: { globalUserId: "global_user_123", tenantSlug: "norte" },
  };

  it("passes the cookie and trimmed optional tenant selector to the resolver", async () => {
    const { createManagementAuthFacade } = await loadManagementAuthFacade();
    const resolveContext = vi.fn().mockResolvedValue(context);
    const auth = createManagementAuthFacade({ resolveContext });

    await expect(
      auth("vase.auth=session-token", "  norte  "),
    ).resolves.toEqual(context);
    expect(resolveContext).toHaveBeenCalledWith(
      "vase.auth=session-token",
      "norte",
    );

    await auth(null, "   ");
    expect(resolveContext).toHaveBeenLastCalledWith(null, undefined);
  });

  it.each([
    "MANAGEMENT_SESSION_REQUIRED",
    "MANAGEMENT_SESSION_INVALID",
    "MANAGEMENT_SESSION_EXPIRED",
    "MANAGEMENT_NOT_ENTITLED",
  ])("returns null for unauthenticated code %s", async (code) => {
    const { createManagementAuthFacade } = await loadManagementAuthFacade();
    const auth = createManagementAuthFacade({
      resolveContext: vi.fn().mockRejectedValue(new Error(code)),
    });

    await expect(auth(null)).resolves.toBeNull();
  });

  it.each([
    "MANAGEMENT_AUTH_SECRET_MISSING",
    "SERVICE_TOKEN_NOT_CONFIGURED",
    "APP_INTERNAL_URL_INVALID",
    "MANAGEMENT_CONTEXT_UNAVAILABLE",
    "MANAGEMENT_CONTEXT_IDENTITY_MISMATCH",
    "MANAGEMENT_CONTEXT_TENANT_MISMATCH",
    "MANAGEMENT_IDENTITY_CONFLICT",
    "UNKNOWN_ERROR",
  ])("rethrows operational or unknown code %s", async (code) => {
    const { createManagementAuthFacade } = await loadManagementAuthFacade();
    const error = new Error(code);
    const auth = createManagementAuthFacade({
      resolveContext: vi.fn().mockRejectedValue(error),
    });

    await expect(auth("cookie")).rejects.toBe(error);
  });
});

describe("Management dashboard central sign-in redirect", () => {
  it("uses absolute app and management URLs and preserves the selected tenant", () => {
    const source = readFileSync(dashboardLayoutPath, "utf8");

    expect(source).toContain("VASE_APP_PUBLIC_URL");
    expect(source).toContain("https://app.vase.ar");
    expect(source).toContain("NEXT_PUBLIC_APP_URL");
    expect(source).toContain("https://management.vase.ar");
    expect(source).toMatch(/new URL\(\s*["']\/signin["']/);
    expect(source).toMatch(/new URL\(\s*["']\/dashboard["']/);
    expect(source).toContain('get("x-vase-tenant-slug")');
    expect(source).toMatch(/searchParams\.set\(["']tenant["']/);
    expect(source).toMatch(/searchParams\.set\(["']redirectTo["']/);
    expect(source).toMatch(/redirect\([^)]*\.toString\(\)\)/);
    expect(source).not.toContain("redirect('/auth/login')");
  });
});

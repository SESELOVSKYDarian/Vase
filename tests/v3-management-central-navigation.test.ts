import { existsSync, readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  localAuthCookieName,
  managementTenantCookieName,
  sharedAuthCookieName,
} from "../packages/auth/src/index";

const redirectMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock(
  "../apps/vase-management/node_modules/next/navigation",
  () => ({ redirect: redirectMock }),
);
vi.mock("@/auth", () => ({ signOut: signOutMock }));

const fileUrl = (path: string) => new URL(`../${path}`, import.meta.url);
const source = (path: string) => readFileSync(fileUrl(path), "utf8");

afterEach(() => {
  redirectMock.mockReset();
  signOutMock.mockReset();
  vi.unstubAllEnvs();
});

describe("Management tenant navigation contract", () => {
  it("exports the tenant cookie name and a strict normalizer", async () => {
    const authPackage = await import("../packages/auth/src/index");
    const normalize = Reflect.get(authPackage, "normalizeManagementTenantSlug");

    expect(Reflect.get(authPackage, "managementTenantCookieName")).toBe(
      "vase-management-tenant",
    );
    expect(typeof normalize).toBe("function");
    expect(normalize("  Norte-01  ")).toBe("norte-01");
    expect(normalize("a".repeat(120))).toBe("a".repeat(120));

    for (const invalid of [
      "",
      "-norte",
      "norte-",
      "norte--sur",
      "norte_sur",
      "../norte",
      "norte\u0000sur",
      "depósito",
      "a".repeat(121),
    ]) {
      expect(normalize(invalid)).toBeUndefined();
    }
  });

});

describe("Management Edge middleware", () => {
  const middleware = source("apps/vase-management/middleware.ts");

  it("is Edge-safe and only matches dashboard pages", () => {
    expect(middleware).not.toContain("NextAuth");
    expect(middleware).not.toContain("@/lib/auth.config");
    expect(middleware).not.toMatch(/Prisma|jsonwebtoken|jose/);
    expect(middleware).toContain('/dashboard/:path*');
  });

  it("recognizes exact and numeric chunk session cookies", () => {
    expect(middleware).toContain("sharedAuthCookieName");
    expect(middleware).toContain("localAuthCookieName");
    expect(middleware).toContain("numericChunkPattern");
  });

  it("sanitizes tenant state and replaces spoofed request headers", () => {
    expect(middleware).toContain("normalizeManagementTenantSlug");
    expect(middleware).toContain("managementTenantCookieName");
    expect(middleware).toContain('requestHeaders.delete("x-vase-tenant-slug")');
    expect(middleware).toContain('requestHeaders.set("x-vase-tenant-slug"');
    expect(middleware).toContain("httpOnly: true");
    expect(middleware).toContain('sameSite: "lax"');
  });

  it("redirects unauthenticated requests centrally with an absolute callback", () => {
    expect(middleware).toContain("VASE_APP_PUBLIC_URL");
    expect(middleware).toContain("https://app.vase.ar");
    expect(middleware).toContain(
      'searchParams.set("redirectTo", request.nextUrl.toString())',
    );
  });

  it.each([
    sharedAuthCookieName,
    `${sharedAuthCookieName}.0`,
    `${sharedAuthCookieName}.12`,
    localAuthCookieName,
    `${localAuthCookieName}.3`,
  ])("allows session cookie family member %s through to authoritative auth", async (name) => {
    const { default: middlewareHandler } = await import(
      "../apps/vase-management/middleware"
    );
    const response = middlewareHandler(new NextRequest(
      "https://management.vase.ar/dashboard",
      { headers: { cookie: `${name}=opaque` } },
    ));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    `${sharedAuthCookieName}.chunk`,
    `${sharedAuthCookieName}.-1`,
    `${localAuthCookieName}.1x`,
  ])("ignores non-decimal session cookie lookalike %s", async (name) => {
    const { default: middlewareHandler } = await import(
      "../apps/vase-management/middleware"
    );
    const response = middlewareHandler(new NextRequest(
      "https://management.vase.ar/dashboard",
      { headers: { cookie: `${name}=opaque` } },
    ));

    expect(response.status).toBe(307);
  });

  it("redirects a missing session with the untouched absolute Management URL", async () => {
    const { default: middlewareHandler } = await import(
      "../apps/vase-management/middleware"
    );
    const response = middlewareHandler(new NextRequest(
      "https://management.vase.ar/dashboard/orders?tenant=Norte&view=open",
    ));
    const destination = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(destination.origin).toBe("https://app.vase.ar");
    expect(destination.pathname).toBe("/signin");
    expect(destination.searchParams.get("redirectTo")).toBe(
      "https://management.vase.ar/dashboard/orders?tenant=Norte&view=open",
    );
  });

  it("persists a normalized query tenant and recovers it on later requests", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: middlewareHandler } = await import(
      "../apps/vase-management/middleware"
    );
    const selected = middlewareHandler(new NextRequest(
      "https://management.vase.ar/dashboard?tenant=%20Norte-Equipos%20",
      {
        headers: {
          cookie: `${sharedAuthCookieName}=opaque`,
          "x-vase-tenant-slug": "spoofed",
        },
      },
    ));

    expect(selected.headers.get("x-middleware-request-x-vase-tenant-slug"))
      .toBe("norte-equipos");
    expect(selected.cookies.get(managementTenantCookieName)).toMatchObject({
      value: "norte-equipos",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    expect(selected.cookies.get(managementTenantCookieName)?.maxAge).toBeGreaterThan(0);

    const recovered = middlewareHandler(new NextRequest(
      "https://management.vase.ar/dashboard/orders",
      {
        headers: {
          cookie: `${localAuthCookieName}=opaque; ${managementTenantCookieName}=sur-equipos`,
          "x-vase-tenant-slug": "spoofed",
        },
      },
    ));
    expect(recovered.headers.get("x-middleware-request-x-vase-tenant-slug"))
      .toBe("sur-equipos");
  });
});

describe("Management central login and logout navigation", () => {
  it("redirects local login centrally while preserving a valid tenant", () => {
    const login = source("apps/vase-management/app/auth/login/page.tsx");

    expect(login).toContain("VASE_APP_PUBLIC_URL");
    expect(login).toContain("normalizeManagementTenantSlug");
    expect(login).toContain("Array.isArray");
    expect(login).toContain('.searchParams.set("tenant"');
    expect(login).not.toContain("admin@demo.com");
    expect(login).not.toContain("next-auth/react");
    expect(login).not.toMatch(/signIn\s*\(/);
  });

  it("retires the ticket UI by redirecting the legacy SSO page to dashboard", () => {
    const sso = source("apps/vase-management/app/auth/sso/page.tsx");

    expect(sso).toMatch(/redirect\(["']\/dashboard["']\)/);
    expect(sso).not.toContain("next-auth/react");
    expect(sso).not.toContain("ticket");
  });

  it("routes Header and access-denied logout through Vase App", () => {
    const header = source("apps/vase-management/components/layout/Header.tsx");
    const denied = source("apps/vase-management/app/auth/access-denied/page.tsx");

    for (const page of [header, denied]) {
      expect(page).toContain("NEXT_PUBLIC_VASE_APP_URL");
      expect(page).toContain("/api/auth/central-logout");
      expect(page).toMatch(/method=["']post["']/);
      expect(page).not.toContain("next-auth/react");
      expect(page).not.toContain("window.location.assign");
    }
  });

  it("adds a POST-only Vase App logout route backed by the authoritative signOut", () => {
    const path = "apps/vase-app/src/app/api/auth/central-logout/route.ts";
    expect(existsSync(fileUrl(path))).toBe(true);
    const logout = source(path);

    expect(logout).toContain('import { signOut } from "@/auth"');
    expect(logout).toMatch(/export async function POST\s*\(/);
    expect(logout).not.toMatch(/export async function GET\s*\(/);
    expect(logout).toContain('signOut({ redirectTo: "/signin" })');
  });

  it("launches Management directly and leaves the ticket endpoint rollback-only", () => {
    const entry = source("apps/vase-app/src/app/(platform)/app/management/page.tsx");
    const rollback = source("apps/vase-app/src/app/api/management/sso/start/route.ts");

    expect(entry).toContain("MANAGEMENT_PUBLIC_URL");
    expect(entry).toContain("https://management.vase.ar");
    expect(entry).toContain('new URL("/dashboard"');
    expect(entry).toContain('searchParams.set("tenant"');
    expect(entry).toContain('import type { Route } from "next"');
    expect(entry).toContain("redirect(destination.toString() as Route)");
    expect(entry).not.toContain("/api/management/sso/start");
    expect(rollback.length).toBeGreaterThan(0);
  });

  it("executes the local login redirect with a safe absolute tenant return URL", async () => {
    const { default: LoginPage } = await import(
      "../apps/vase-management/app/auth/login/page"
    );

    let redirectError: unknown;
    try {
      LoginPage({ searchParams: { tenant: " Norte-Equipos " } });
    } catch (error) {
      redirectError = error;
    }

    const expectedDestination =
      "https://app.vase.ar/signin?redirectTo=https%3A%2F%2Fmanagement.vase.ar%2Fdashboard%3Ftenant%3Dnorte-equipos";
    if (redirectError) {
      expect(redirectError).toMatchObject({
        digest: expect.stringContaining(expectedDestination),
      });
    } else {
      expect(redirectMock).toHaveBeenCalledWith(expectedDestination);
    }
  });

  it("does not expose GET for central logout", async () => {
    const logoutRoute = await import(
      "../apps/vase-app/src/app/api/auth/central-logout/route"
    );

    expect(Reflect.get(logoutRoute, "GET")).toBeUndefined();
  });

  it.each([
    "https://evil.example",
    "null",
    null,
  ])("rejects central logout POST from untrusted Origin %s", async (origin) => {
    const { POST } = await import(
      "../apps/vase-app/src/app/api/auth/central-logout/route"
    );
    const response = await POST(new Request(
      "https://app.vase.ar/api/auth/central-logout",
      { method: "POST", headers: origin ? { origin } : undefined },
    ));

    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(403);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("executes trusted Management logout through shared Auth.js", async () => {
    const { POST } = await import(
      "../apps/vase-app/src/app/api/auth/central-logout/route"
    );

    await POST(new Request(
      "https://app.vase.ar/api/auth/central-logout",
      { method: "POST", headers: { origin: "https://management.vase.ar" } },
    ));

    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/signin" });
  });

  it("does not trust an Origin merely because it matches the request Host", async () => {
    const { POST } = await import(
      "../apps/vase-app/src/app/api/auth/central-logout/route"
    );
    const response = await POST(new Request(
      "https://evil.example/api/auth/central-logout",
      { method: "POST", headers: { origin: "https://evil.example" } },
    ));

    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(403);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("allows localhost Management logout during development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { POST } = await import(
      "../apps/vase-app/src/app/api/auth/central-logout/route"
    );

    await POST(new Request(
      "http://localhost:3002/api/auth/central-logout",
      { method: "POST", headers: { origin: "http://localhost:3006" } },
    ));

    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/signin" });
  });

  it("executes the async Vase App launcher directly to Management", async () => {
    const { default: ManagementEntryPage } = await import(
      "../apps/vase-app/src/app/(platform)/app/management/page"
    );

    await ManagementEntryPage({
      searchParams: Promise.resolve({ tenant: " Norte-Equipos " }),
    });

    expect(redirectMock).toHaveBeenCalledWith(
      "https://management.vase.ar/dashboard?tenant=norte-equipos",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  buildPublicRequestUrl,
  buildAdminCanonicalUrl,
  isAdminHost,
  resolveAdminAccessDecision,
  resolveAdminNavigationPath,
  normalizeAdminPathForActiveState,
  resolveAdminHostRequest,
  toInternalAdminPath,
  toPublicAdminPath,
} from "@/lib/security/admin-host-routing";

describe("public request URL behind a reverse proxy", () => {
  it("preserves the forwarded admin host instead of the internal origin", () => {
    expect(buildPublicRequestUrl({
      url: "http://vase-app:3002/users?status=active",
      hostname: "admin.vase.ar",
      protocol: "https",
    })).toBe("https://admin.vase.ar/users?status=active");
  });
});

const routes = [
  ["/", "/app/admin"],
  ["/users", "/app/admin/users"],
  ["/modules", "/app/admin/modules"],
  ["/management", "/app/admin/management"],
  ["/labs", "/app/admin/labs"],
  ["/rest", "/app/admin/rest"],
  ["/finance", "/app/admin/finance"],
  ["/expenses", "/app/admin/expenses"],
  ["/meetings", "/app/admin/meetings"],
  ["/customizations", "/app/admin/customizations"],
  ["/development", "/app/admin/development"],
  ["/tickets", "/app/admin/tickets"],
  ["/support", "/app/admin/support"],
  ["/faqs", "/app/admin/faqs"],
  ["/wiki", "/app/admin/wiki"],
  ["/settings", "/app/admin/settings"],
  ["/audit", "/app/admin/audit"],
] as const;

describe("admin host routing", () => {
  it.each(routes)("maps clean %s to internal %s", (publicPath, internalPath) => {
    expect(toInternalAdminPath(publicPath)).toBe(internalPath);
    expect(toPublicAdminPath(internalPath)).toBe(publicPath);
  });

  it("preserves nested route suffixes", () => {
    expect(toInternalAdminPath("/users/customer-1")).toBe("/app/admin/users/customer-1");
    expect(toPublicAdminPath("/app/admin/users/customer-1")).toBe("/users/customer-1");
  });

  it("does not expose unknown admin sections", () => {
    expect(toInternalAdminPath("/app/owner")).toBeNull();
    expect(toInternalAdminPath("/unknown")).toBeNull();
    expect(toPublicAdminPath("/app/help")).toBeNull();
  });

  it("recognizes the configured admin host", () => {
    expect(isAdminHost("admin.vase.ar", { nodeEnv: "production" })).toBe(true);
    expect(isAdminHost("admin.vase.ar:443", { nodeEnv: "production" })).toBe(true);
    expect(isAdminHost("app.vase.ar", { nodeEnv: "production" })).toBe(false);
    expect(isAdminHost("admin.localhost:3002", {
      nodeEnv: "development",
      adminHost: "admin.localhost:3002",
    })).toBe(true);
  });

  it("rewrites clean pages and preserves their query", () => {
    expect(resolveAdminHostRequest({
      hostname: "admin.vase.ar",
      url: "https://admin.vase.ar/users?status=active",
      input: { nodeEnv: "production" },
    })).toEqual({
      type: "rewrite",
      url: "https://admin.vase.ar/app/admin/users?status=active",
    });
  });

  it("allows only required assets and admin browser APIs", () => {
    for (const path of ["/_next/static/app.js", "/favicon.ico", "/api/auth/session", "/api/admin/rest/plans", "/api/health/ready"]) {
      expect(resolveAdminHostRequest({
        hostname: "admin.vase.ar",
        url: `https://admin.vase.ar${path}`,
        input: { nodeEnv: "production" },
      })).toEqual({ type: "allow" });
    }
    expect(resolveAdminHostRequest({
      hostname: "admin.vase.ar",
      url: "https://admin.vase.ar/api/sites",
      input: { nodeEnv: "production" },
    })).toEqual({ type: "reject", status: 404 });
  });

  it("rejects unknown clean pages", () => {
    expect(resolveAdminHostRequest({
      hostname: "admin.vase.ar",
      url: "https://admin.vase.ar/app/owner",
      input: { nodeEnv: "production" },
    })).toEqual({ type: "reject", status: 404 });
  });

  it("keeps authentication pages on the primary App host", () => {
    expect(resolveAdminHostRequest({
      hostname: "admin.vase.ar",
      url: "https://admin.vase.ar/signin?redirectTo=https%3A%2F%2Fadmin.vase.ar%2Fusers",
      input: { nodeEnv: "production" },
    })).toEqual({
      type: "redirect",
      url: "https://app.vase.ar/signin?redirectTo=https%3A%2F%2Fadmin.vase.ar%2Fusers",
    });
  });

  it("builds the canonical clean URL for legacy App routes", () => {
    expect(buildAdminCanonicalUrl({
      url: "https://app.vase.ar/app/admin/users?status=active",
      input: { nodeEnv: "production" },
    })).toBe("https://admin.vase.ar/users?status=active");
    expect(buildAdminCanonicalUrl({
      url: "https://app.vase.ar/app/help",
      input: { nodeEnv: "production" },
    })).toBeNull();
  });

  it("sends signed-out users once to the canonical App login", () => {
    expect(resolveAdminAccessDecision({
      hostname: "admin.vase.ar",
      url: "https://admin.vase.ar/users?status=active",
      isSignedIn: false,
      isEmailVerified: false,
      platformRole: null,
      input: { nodeEnv: "production" },
    })).toEqual({
      type: "redirect",
      url: "https://app.vase.ar/signin?redirectTo=https%3A%2F%2Fadmin.vase.ar%2Fusers%3Fstatus%3Dactive",
    });
  });

  it("keeps verification on App and returns to the clean Admin URL", () => {
    expect(resolveAdminAccessDecision({
      hostname: "admin.vase.ar",
      url: "https://admin.vase.ar/",
      isSignedIn: true,
      isEmailVerified: false,
      platformRole: "SUPER_ADMIN",
      input: { nodeEnv: "production" },
    })).toEqual({
      type: "redirect",
      url: "https://app.vase.ar/verify-email?redirectTo=https%3A%2F%2Fadmin.vase.ar%2F",
    });
  });

  it("returns forbidden for verified users without the Super Admin role", () => {
    expect(resolveAdminAccessDecision({
      hostname: "admin.vase.ar",
      url: "https://admin.vase.ar/users",
      isSignedIn: true,
      isEmailVerified: true,
      platformRole: "USER",
      input: { nodeEnv: "production" },
    })).toEqual({ type: "reject", status: 403 });
  });

  it("rewrites a verified Super Admin clean route", () => {
    expect(resolveAdminAccessDecision({
      hostname: "admin.vase.ar",
      url: "https://admin.vase.ar/users",
      isSignedIn: true,
      isEmailVerified: true,
      platformRole: "SUPER_ADMIN",
      input: { nodeEnv: "production" },
    })).toEqual({
      type: "rewrite",
      url: "https://admin.vase.ar/app/admin/users",
    });
  });

  it("does not apply Admin access decisions to other hosts", () => {
    expect(resolveAdminAccessDecision({
      hostname: "app.vase.ar",
      url: "https://app.vase.ar/app",
      isSignedIn: false,
      isEmailVerified: false,
      platformRole: null,
      input: { nodeEnv: "production" },
    })).toEqual({ type: "allow" });
  });

  it("generates clean navigation only on the Admin host", () => {
    expect(resolveAdminNavigationPath("/app/admin/users", "admin.vase.ar", {
      nodeEnv: "production",
    })).toBe("/users");
    expect(resolveAdminNavigationPath("/app/admin/users", "app.vase.ar", {
      nodeEnv: "production",
    })).toBe("/app/admin/users");
  });

  it("normalizes clean paths for active Admin navigation", () => {
    expect(normalizeAdminPathForActiveState("/users/customer-1", "admin.vase.ar", {
      nodeEnv: "production",
    })).toBe("/app/admin/users/customer-1");
    expect(normalizeAdminPathForActiveState("/app/admin/users", "app.vase.ar", {
      nodeEnv: "production",
    })).toBe("/app/admin/users");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildAdminCanonicalUrl,
  isAdminHost,
  resolveAdminHostRequest,
  toInternalAdminPath,
  toPublicAdminPath,
} from "@/lib/security/admin-host-routing";

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
    for (const path of ["/_next/static/app.js", "/favicon.ico", "/api/auth/session", "/api/admin/rest/plans"]) {
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
});

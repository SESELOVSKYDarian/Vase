import { describe, expect, it } from "vitest";
import {
  buildDefaultPlatformRedirectUrl,
  buildLabsHostRedirectUrl,
  buildPublicSiteRedirectUrl,
  buildPrimaryHostRedirectUrl,
  getDefaultPlatformPathForHost,
  isLabsHost,
  isLabsWorkspacePath,
  isPlatformHost,
  resolveEditorHost,
  resolvePlatformHosts,
  resolveLabsHostRequest,
  resolvePrimaryPlatformHost,
  resolveRequestHostname,
} from "@/lib/security/platform-hosts";

describe("platform host resolution", () => {
  it("prefers the public Admin host when the proxy also sends an internal host", () => {
    expect(resolveRequestHostname({
      forwardedHost: "vase_app-vase:3002",
      host: "admin.vase.ar",
      nodeEnv: "production",
    })).toBe("admin.vase.ar");
  });

  it("accepts the original host when every standard proxy host is internal", () => {
    expect(resolveRequestHostname({
      forwardedHost: "vase_app-vase:3002",
      host: "vase_app-vase:3002",
      originalHost: "admin.vase.ar",
      nodeEnv: "production",
    })).toBe("admin.vase.ar");
  });

  it("treats a dedicated labs domain as a platform host", () => {
    const input = {
      nodeEnv: "production",
      appUrl: "https://labs.vase.ar",
      trustedOrigins: "https://labs.vase.ar,https://vase.ar",
    };

    expect(resolvePlatformHosts(input)).toEqual(
      expect.arrayContaining(["labs.vase.ar", "vase.ar", "www.vase.ar"]),
    );
    expect(isPlatformHost("labs.vase.ar", input)).toBe(true);
    expect(isPlatformHost("demo.vase.ar", input)).toBe(false);
  });

  it("treats the dedicated Admin domain as a platform host", () => {
    expect(isPlatformHost("admin.vase.ar", { nodeEnv: "production" })).toBe(true);
  });

  it("routes the dedicated labs host to the Labs workspace by default", () => {
    const input = {
      nodeEnv: "production",
      appUrl: "https://labs.vase.ar",
      trustedOrigins: "https://labs.vase.ar,https://vase.ar",
    };

    expect(isLabsHost("labs.vase.ar", input)).toBe(true);
    expect(isLabsHost("vase.ar", input)).toBe(false);
    expect(getDefaultPlatformPathForHost("labs.vase.ar", input)).toBe("/app/owner/labs");
    expect(getDefaultPlatformPathForHost("vase.ar", input)).toBe("/app");
  });

  it("redirects Labs routes to the dedicated Labs host", () => {
    const input = {
      nodeEnv: "production",
      appUrl: "https://vase.ar",
      trustedOrigins: "https://vase.ar",
    };

    expect(isLabsWorkspacePath("/app/labs")).toBe(true);
    expect(isLabsWorkspacePath("/app/labs/starter")).toBe(true);
    expect(isLabsWorkspacePath("/app/owner/labs")).toBe(true);
    expect(isLabsWorkspacePath("/app/owner/labs/activity")).toBe(true);
    expect(isLabsWorkspacePath("/app/owner")).toBe(false);

    expect(
      buildLabsHostRedirectUrl({
        hostname: "vase.ar",
        url: "https://vase.ar/app/owner/labs?tab=activity",
        input,
      }),
    ).toBe("https://labs.vase.ar/app/owner/labs?tab=activity");
    expect(
      buildLabsHostRedirectUrl({
        hostname: "vase.ar",
        url: "https://vase.ar:3000/app/labs",
        input,
      }),
    ).toBe("https://labs.vase.ar/app/owner/labs");
    expect(
      buildLabsHostRedirectUrl({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/app/owner/labs",
        input,
      }),
    ).toBeNull();
  });

  it("redirects non-Labs routes from the Labs host back to the primary platform host", () => {
    const input = {
      nodeEnv: "production",
      appUrl: "https://labs.vase.ar",
      trustedOrigins: "https://vase.ar,https://labs.vase.ar",
    };

    expect(
      buildPrimaryHostRedirectUrl({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/app/labs",
        input,
      }),
    ).toBeNull();
    expect(
      buildPrimaryHostRedirectUrl({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/app/help",
        input,
      }),
    ).toBe("https://app.vase.ar/app/help");
    expect(
      buildPrimaryHostRedirectUrl({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/app/owner/labs/activity?tab=recent",
        input,
      }),
    ).toBeNull();
    expect(
      buildPrimaryHostRedirectUrl({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/signin?redirectTo=%2Fapp%2Flabs",
        input,
      }),
    ).toBe("https://app.vase.ar/signin?redirectTo=%2Fapp%2Flabs");
    expect(
      buildPrimaryHostRedirectUrl({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/api/modules",
        input,
      }),
    ).toBeNull();
  });

  it("uses the configured editor URL host when present", () => {
    expect(
      resolveEditorHost({
        nodeEnv: "production",
        editorUrl: "https://editor.vase.ar/admin/evolution",
      }),
    ).toBe("editor.vase.ar");
    expect(resolveEditorHost({ nodeEnv: "development" })).toBe("localhost:5173");
  });

  it("uses app.vase.ar as the production authenticated host", () => {
    expect(
      resolvePrimaryPlatformHost({
        nodeEnv: "production",
      }),
    ).toBe("app.vase.ar");

    expect(
      buildDefaultPlatformRedirectUrl({
        hostname: "app.vase.ar",
        url: "https://app.vase.ar/",
        input: { nodeEnv: "production" },
      }),
    ).toBe("https://app.vase.ar/app");
  });

  it("normalizes Labs entry routes to the Labs owner panel", () => {
    const input = { nodeEnv: "production" };

    expect(
      resolveLabsHostRequest({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/",
        input,
      }),
    ).toEqual({
      type: "redirect",
      url: "https://labs.vase.ar/app/owner/labs",
    });
    expect(
      resolveLabsHostRequest({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/app/help",
        input,
      }),
    ).toEqual({
      type: "redirect",
      url: "https://labs.vase.ar/app/owner/labs",
    });
  });

  it("centralizes Labs authentication on App", () => {
    expect(
      resolveLabsHostRequest({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs",
        input: { nodeEnv: "production" },
      }),
    ).toEqual({
      type: "redirect",
      url: "https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs",
    });
  });

  it("rejects unrelated APIs on the Labs host", () => {
    expect(
      resolveLabsHostRequest({
        hostname: "labs.vase.ar",
        url: "https://labs.vase.ar/api/modules",
        input: { nodeEnv: "production" },
      }),
    ).toEqual({ type: "reject", status: 404 });
  });

  it("allows only Labs infrastructure APIs", () => {
    for (const path of [
      "/api/auth/session",
      "/api/labs/inbox",
      "/api/health/live",
    ]) {
      expect(
        resolveLabsHostRequest({
          hostname: "labs.vase.ar",
          url: `https://labs.vase.ar${path}`,
          input: { nodeEnv: "production" },
        }),
      ).toEqual({ type: "allow" });
    }
  });

  it("redirects App marketing routes to Portal", () => {
    expect(
      buildPublicSiteRedirectUrl({
        hostname: "app.vase.ar",
        url: "https://app.vase.ar/precios?from=app",
        input: { nodeEnv: "production" },
      }),
    ).toBe("https://vase.ar/precios?from=app");
  });

  it("uses business.vase.ar as the default Business editor host", () => {
    expect(resolveEditorHost({ nodeEnv: "production" })).toBe("business.vase.ar");
  });
});

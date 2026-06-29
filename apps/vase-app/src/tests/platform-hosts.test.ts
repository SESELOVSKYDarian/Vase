import { describe, expect, it } from "vitest";
import {
  buildPrimaryHostRedirectUrl,
  buildLabsHostRedirectUrl,
  getDefaultPlatformPathForHost,
  isLabsWorkspacePath,
  isLabsHost,
  isPlatformHost,
  resolveEditorHost,
  resolvePlatformHosts,
} from "@/lib/security/platform-hosts";

describe("platform host resolution", () => {
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

  it("routes the dedicated labs host to the Labs workspace by default", () => {
    const input = {
      nodeEnv: "production",
      appUrl: "https://labs.vase.ar",
      trustedOrigins: "https://labs.vase.ar,https://vase.ar",
    };

    expect(isLabsHost("labs.vase.ar", input)).toBe(true);
    expect(isLabsHost("vase.ar", input)).toBe(false);
    expect(getDefaultPlatformPathForHost("labs.vase.ar", input)).toBe("/app/labs");
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
    ).toBe("https://labs.vase.ar/app/labs");
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
    ).toBe("https://vase.ar/app/help");
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
    ).toBe("https://vase.ar/signin?redirectTo=%2Fapp%2Flabs");
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
});

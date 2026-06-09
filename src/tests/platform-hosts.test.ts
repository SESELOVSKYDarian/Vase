import { describe, expect, it } from "vitest";
import {
  getDefaultPlatformPathForHost,
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

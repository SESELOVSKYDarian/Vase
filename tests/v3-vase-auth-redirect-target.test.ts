import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { authConfig } from "../apps/vase-app/src/auth.config";
import { normalizeVaseRedirectTarget } from "../apps/vase-app/src/lib/auth/redirect-target";

const signInPagePath = new URL(
  "../apps/vase-app/src/app/(auth)/signin/page.tsx",
  import.meta.url,
);
const authActionsPath = new URL(
  "../apps/vase-app/src/app/(auth)/actions.ts",
  import.meta.url,
);
const authConfigPath = new URL(
  "../apps/vase-app/src/auth.config.ts",
  import.meta.url,
);

describe("normalizeVaseRedirectTarget", () => {
  it.each([
    "/app",
    "/app?from=signin#ready",
    "/dashboard?tenant=norte",
  ])("preserves safe relative target %s", (target) => {
    expect(normalizeVaseRedirectTarget(target)).toBe(target);
  });

  it.each([
    "https://vase.ar/app",
    "https://app.vase.ar/app?tenant=norte",
    "https://management.vase.ar/dashboard?tenant=norte",
    "https://deep.service.vase.ar/path#section",
  ])("preserves trusted HTTPS Vase target %s", (target) => {
    expect(
      normalizeVaseRedirectTarget(target, { nodeEnv: "production" }),
    ).toBe(target);
  });

  it.each([
    "http://localhost:3002/app",
    "http://127.0.0.1:3006/dashboard?tenant=norte",
  ])("allows local HTTP target %s outside production", (target) => {
    expect(
      normalizeVaseRedirectTarget(target, { nodeEnv: "development" }),
    ).toBe(target);
    expect(
      normalizeVaseRedirectTarget(target, { nodeEnv: "production" }),
    ).toBe("/app");
  });

  it.each([
    "",
    "   ",
    "javascript:alert(1)",
    "//management.vase.ar/dashboard",
    "/\\attacker.example/dashboard",
    "https://user:secret@management.vase.ar/dashboard",
    "https://example.com/dashboard",
    "https://evilvase.ar/dashboard",
    "https://vase.ar.evil.example/dashboard",
    "http://management.vase.ar/dashboard",
    "not a URL",
  ])("rejects unsafe target %j", (target) => {
    expect(
      normalizeVaseRedirectTarget(target, {
        fallback: "/safe-fallback",
        nodeEnv: "production",
      }),
    ).toBe("/safe-fallback");
  });
});

describe("Vase sign-in redirect wiring", () => {
  it("uses the shared helper in both the sign-in page and server actions", () => {
    const signInPageSource = readFileSync(signInPagePath, "utf8");
    const authActionsSource = readFileSync(authActionsPath, "utf8");

    for (const source of [signInPageSource, authActionsSource]) {
      expect(source).toContain("normalizeVaseRedirectTarget");
      expect(source).toContain("@/lib/auth/redirect-target");
      expect(source).not.toContain("function normalizeRedirectTarget");
    }
  });

  it("wires the shared helper into the Auth.js redirect callback", async () => {
    const authConfigSource = readFileSync(authConfigPath, "utf8");
    expect(authConfigSource).toContain("normalizeVaseRedirectTarget");
    expect(authConfigSource).toContain("async redirect({ url, baseUrl })");

    const redirectCallback = authConfig.callbacks.redirect;
    expect(redirectCallback).toBeTypeOf("function");
    if (!redirectCallback) throw new Error("AUTH_REDIRECT_CALLBACK_MISSING");

    await expect(
      redirectCallback({
        url: "https://management.vase.ar/dashboard?tenant=norte",
        baseUrl: "https://app.vase.ar",
      }),
    ).resolves.toBe("https://management.vase.ar/dashboard?tenant=norte");
    await expect(
      redirectCallback({
        url: "/app?from=signin",
        baseUrl: "https://app.vase.ar",
      }),
    ).resolves.toBe("https://app.vase.ar/app?from=signin");
    await expect(
      redirectCallback({
        url: "https://attacker.example/dashboard",
        baseUrl: "https://app.vase.ar",
      }),
    ).resolves.toBe("https://app.vase.ar/app");
  });
});

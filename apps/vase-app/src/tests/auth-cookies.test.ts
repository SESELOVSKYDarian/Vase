import { describe, expect, it } from "vitest";
import { createAuthCookiesConfig, resolveAuthCookieDomain } from "@/lib/auth/cookies";

describe("auth cookie configuration", () => {
  it("shares the session cookie across Vase subdomains in production", () => {
    const cookies = createAuthCookiesConfig({
      NODE_ENV: "production",
    });

    expect(resolveAuthCookieDomain({ NODE_ENV: "production" })).toBe(".vase.ar");
    expect(cookies?.sessionToken?.name).toBe("__Secure-authjs.session-token");
    expect(cookies?.sessionToken?.options).toMatchObject({
      domain: ".vase.ar",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("allows overriding the shared auth cookie domain", () => {
    expect(
      resolveAuthCookieDomain({
        AUTH_COOKIE_DOMAIN: ".staging.vase.ar",
        NODE_ENV: "production",
      }),
    ).toBe(".staging.vase.ar");
  });

  it("uses the shared domain when EasyPanel exposes Vase production hosts without NODE_ENV", () => {
    expect(
      resolveAuthCookieDomain({
        NEXT_PUBLIC_APP_URL: "https://app.vase.ar",
      }),
    ).toBe(".vase.ar");

    expect(
      resolveAuthCookieDomain({
        VASE_LABS_HOST: "labs.vase.ar",
      }),
    ).toBe(".vase.ar");
  });

  it("keeps host-only cookies outside production", () => {
    expect(resolveAuthCookieDomain({ NODE_ENV: "development" })).toBeUndefined();
    expect(createAuthCookiesConfig({ NODE_ENV: "development" })).toBeUndefined();
  });
});

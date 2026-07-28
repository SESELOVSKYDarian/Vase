import { encode } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import {
  localAuthCookieName,
  sharedAuthCookieName,
} from "../packages/auth/src/index";
import { readSharedRestSession } from "../apps/vase-rest/app/lib/shared-session";

describe("Vase Rest shared owner session", () => {
  const secret = "test-auth-secret-with-at-least-32-characters";

  it("decodes the shared Vase App cookie", async () => {
    const token = await encode({
      token: {
        sub: "user_123",
        email: "owner@example.com",
        sessionExpiresAt: Date.now() + 60_000,
      },
      secret,
      salt: sharedAuthCookieName,
      maxAge: 60,
    });

    await expect(readSharedRestSession({
      cookieHeader: `${sharedAuthCookieName}=${encodeURIComponent(token)}`,
      secret,
    })).resolves.toMatchObject({
      globalUserId: "user_123",
      email: "owner@example.com",
    });
  });

  it("decodes the local development cookie", async () => {
    const token = await encode({
      token: { sub: "local_user", sessionExpiresAt: Date.now() + 60_000 },
      secret,
      salt: localAuthCookieName,
      maxAge: 60,
    });

    await expect(readSharedRestSession({
      cookieHeader: `${localAuthCookieName}=${encodeURIComponent(token)}`,
      secret,
    })).resolves.toMatchObject({ globalUserId: "local_user" });
  });

  it("rejects missing and expired sessions with stable codes", async () => {
    await expect(readSharedRestSession({
      cookieHeader: null,
      secret,
    })).rejects.toThrow("REST_SESSION_REQUIRED");

    const expired = await encode({
      token: { sub: "user_123", sessionExpiresAt: Date.now() - 1 },
      secret,
      salt: sharedAuthCookieName,
      maxAge: 60,
    });
    await expect(readSharedRestSession({
      cookieHeader: `${sharedAuthCookieName}=${encodeURIComponent(expired)}`,
      secret,
    })).rejects.toThrow("REST_SESSION_EXPIRED");
  });
});

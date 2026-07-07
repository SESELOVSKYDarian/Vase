import { encode } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import { sharedAuthCookieName } from "../packages/auth/src/index";
import { readSharedLabsSession } from "../apps/vase-labs/app/lib/shared-session";

describe("Vase Labs shared session", () => {
  it("validates App's encrypted JWT cookie with the shared secret", async () => {
    const secret = "test-auth-secret-with-at-least-32-characters";
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

    await expect(
      readSharedLabsSession({
        cookieHeader: `${sharedAuthCookieName}=${encodeURIComponent(token)}`,
        secret,
        now: Date.now(),
      }),
    ).resolves.toMatchObject({
      globalUserId: "user_123",
      email: "owner@example.com",
    });
  });

  it("rejects a missing shared session", async () => {
    await expect(
      readSharedLabsSession({
        cookieHeader: null,
        secret: "test-auth-secret-with-at-least-32-characters",
      }),
    ).rejects.toThrow("LABS_SESSION_REQUIRED");
  });

  it("accepts NextAuth's host-only cookie during local development", async () => {
    const secret = "test-auth-secret-with-at-least-32-characters";
    const token = await encode({
      token: { sub: "local_user", sessionExpiresAt: Date.now() + 60_000 },
      secret,
      salt: "authjs.session-token",
      maxAge: 60,
    });

    await expect(
      readSharedLabsSession({
        cookieHeader: `authjs.session-token=${encodeURIComponent(token)}`,
        secret,
      }),
    ).resolves.toMatchObject({ globalUserId: "local_user" });
  });
});

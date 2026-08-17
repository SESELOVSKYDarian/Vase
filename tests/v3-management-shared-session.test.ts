import { encode } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import {
  localAuthCookieName,
  sharedAuthCookieName,
} from "../packages/auth/src/index";
import { readSharedManagementSession } from "../apps/vase-management/lib/central-session/shared-session";

describe("Management shared Vase session", () => {
  const secret = "test-auth-secret-with-at-least-32-characters";
  const now = 2_000_000_000_000;

  it("decodes the shared Vase App cookie into the allowlisted identity", async () => {
    const sessionExpiresAt = now + 60_000;
    const token = await encode({
      token: {
        sub: "user_123",
        email: "owner@example.com",
        sessionExpiresAt,
      },
      secret,
      salt: sharedAuthCookieName,
      maxAge: 60,
    });

    await expect(readSharedManagementSession({
      cookieHeader: `${sharedAuthCookieName}=${encodeURIComponent(token)}`,
      secret,
      now,
    })).resolves.toEqual({
      globalUserId: "user_123",
      email: "owner@example.com",
      sessionExpiresAt,
    });
  });

  it("decodes the host-only cookie during local development", async () => {
    const token = await encode({
      token: { sub: "local_user", sessionExpiresAt: now + 60_000 },
      secret,
      salt: localAuthCookieName,
      maxAge: 60,
    });

    await expect(readSharedManagementSession({
      cookieHeader: `${localAuthCookieName}=${encodeURIComponent(token)}`,
      secret,
      now,
    })).resolves.toEqual({
      globalUserId: "local_user",
      email: "",
      sessionExpiresAt: now + 60_000,
    });
  });

  it("rejects a missing session cookie", async () => {
    await expect(readSharedManagementSession({
      cookieHeader: null,
      secret,
    })).rejects.toThrow("MANAGEMENT_SESSION_REQUIRED");
  });

  it("rejects an expired numeric session expiry", async () => {
    const token = await encode({
      token: { sub: "user_123", sessionExpiresAt: now },
      secret,
      salt: sharedAuthCookieName,
      maxAge: 60,
    });

    await expect(readSharedManagementSession({
      cookieHeader: `${sharedAuthCookieName}=${encodeURIComponent(token)}`,
      secret,
      now,
    })).rejects.toThrow("MANAGEMENT_SESSION_EXPIRED");
  });

  it("rejects a missing auth secret", async () => {
    await expect(readSharedManagementSession({
      cookieHeader: null,
      secret: undefined,
    })).rejects.toThrow("MANAGEMENT_AUTH_SECRET_MISSING");
  });

  it("rejects a decoded token without a subject", async () => {
    const token = await encode({
      token: { email: "owner@example.com", sessionExpiresAt: now + 60_000 },
      secret,
      salt: sharedAuthCookieName,
      maxAge: 60,
    });

    await expect(readSharedManagementSession({
      cookieHeader: `${sharedAuthCookieName}=${encodeURIComponent(token)}`,
      secret,
      now,
    })).rejects.toThrow("MANAGEMENT_SESSION_INVALID");
  });

  it("normalizes malformed token decode errors", async () => {
    await expect(readSharedManagementSession({
      cookieHeader: `${sharedAuthCookieName}=not-an-encrypted-token`,
      secret,
      now,
    })).rejects.toThrow("MANAGEMENT_SESSION_INVALID");
  });
});

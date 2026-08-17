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

  it("decodes numerically ordered shared cookie chunks", async () => {
    const sessionExpiresAt = now + 60_000;
    const token = await encode({
      token: {
        sub: "chunked_user",
        email: "chunked@example.com",
        sessionExpiresAt,
      },
      secret,
      salt: sharedAuthCookieName,
      maxAge: 60,
    });
    const chunkSize = Math.ceil(token.length / 3);
    const chunks = [
      token.slice(0, chunkSize),
      token.slice(chunkSize, chunkSize * 2),
      token.slice(chunkSize * 2),
    ];

    const numberedChunks = [
      { suffix: 0, value: chunks[0] },
      { suffix: 2, value: chunks[1] },
      { suffix: 10, value: chunks[2] },
    ];

    await expect(readSharedManagementSession({
      cookieHeader: [numberedChunks[2], numberedChunks[0], numberedChunks[1]]
        .map(({ suffix, value }) =>
          `${sharedAuthCookieName}.${suffix}=${encodeURIComponent(value)}`)
        .join("; "),
      secret,
      now,
    })).resolves.toEqual({
      globalUserId: "chunked_user",
      email: "chunked@example.com",
      sessionExpiresAt,
    });
  });

  it("normalizes malformed percent-encoding in the shared cookie", async () => {
    await expect(readSharedManagementSession({
      cookieHeader: `${sharedAuthCookieName}=%E0%A4%A`,
      secret,
      now,
    })).rejects.toThrow("MANAGEMENT_SESSION_INVALID");
  });

  it("normalizes malformed percent-encoding in a shared cookie chunk", async () => {
    await expect(readSharedManagementSession({
      cookieHeader: `${sharedAuthCookieName}.0=%E0%A4%A`,
      secret,
      now,
    })).rejects.toThrow("MANAGEMENT_SESSION_INVALID");
  });

  it("does not downgrade to a valid local cookie when shared chunks are invalid", async () => {
    const localToken = await encode({
      token: { sub: "local_user", sessionExpiresAt: now + 60_000 },
      secret,
      salt: localAuthCookieName,
      maxAge: 60,
    });

    await expect(readSharedManagementSession({
      cookieHeader: [
        `${sharedAuthCookieName}.1=token`,
        `${localAuthCookieName}=${encodeURIComponent(localToken)}`,
        `${sharedAuthCookieName}.0=invalid-`,
      ].join("; "),
      secret,
      now,
    })).rejects.toThrow("MANAGEMENT_SESSION_INVALID");
  });

  it("ignores non-numeric cookie suffixes", async () => {
    const localToken = await encode({
      token: { sub: "local_user", sessionExpiresAt: now + 60_000 },
      secret,
      salt: localAuthCookieName,
      maxAge: 60,
    });

    await expect(readSharedManagementSession({
      cookieHeader: [
        `${sharedAuthCookieName}.not-a-chunk=%E0%A4%A`,
        `${localAuthCookieName}=${encodeURIComponent(localToken)}`,
      ].join("; "),
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

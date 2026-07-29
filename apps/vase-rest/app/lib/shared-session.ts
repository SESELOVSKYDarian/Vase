import { decode } from "next-auth/jwt";
import {
  getCookieValue,
  localAuthCookieName,
  sharedAuthCookieName,
} from "@vase/auth";

export async function readSharedRestSession(input: {
  cookieHeader: string | null;
  secret: string | undefined;
  now?: number;
}) {
  if (!input.secret) throw new Error("REST_AUTH_SECRET_MISSING");

  const cookieName = getCookieValue(input.cookieHeader, sharedAuthCookieName)
    ? sharedAuthCookieName
    : localAuthCookieName;
  const encryptedToken = getCookieValue(input.cookieHeader, cookieName);
  if (!encryptedToken) throw new Error("REST_SESSION_REQUIRED");

  const token = await decode({
    token: encryptedToken,
    secret: input.secret,
    salt: cookieName,
  });
  if (!token?.sub) throw new Error("REST_SESSION_INVALID");

  const now = input.now ?? Date.now();
  const sessionExpiresAt = typeof token.sessionExpiresAt === "number"
    ? token.sessionExpiresAt
    : undefined;
  if (sessionExpiresAt !== undefined && sessionExpiresAt <= now) {
    throw new Error("REST_SESSION_EXPIRED");
  }

  return {
    globalUserId: token.sub,
    email: typeof token.email === "string" ? token.email : "",
    sessionExpiresAt,
  };
}

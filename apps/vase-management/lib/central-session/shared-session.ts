import { decode } from "next-auth/jwt";
import {
  getCookieValue,
  localAuthCookieName,
  sharedAuthCookieName,
} from "@vase/auth";

export async function readSharedManagementSession(input: {
  cookieHeader: string | null;
  secret: string | undefined;
  now?: number;
}) {
  if (!input.secret) {
    throw new Error("MANAGEMENT_AUTH_SECRET_MISSING");
  }

  const cookieName = getCookieValue(input.cookieHeader, sharedAuthCookieName)
    ? sharedAuthCookieName
    : localAuthCookieName;
  const encryptedToken = getCookieValue(input.cookieHeader, cookieName);
  if (!encryptedToken) {
    throw new Error("MANAGEMENT_SESSION_REQUIRED");
  }

  let token;
  try {
    token = await decode({
      token: encryptedToken,
      secret: input.secret,
      salt: cookieName,
    });
  } catch {
    throw new Error("MANAGEMENT_SESSION_INVALID");
  }

  if (!token?.sub) {
    throw new Error("MANAGEMENT_SESSION_INVALID");
  }

  const now = input.now ?? Date.now();
  const sessionExpiresAt =
    typeof token.sessionExpiresAt === "number" ? token.sessionExpiresAt : undefined;

  if (sessionExpiresAt !== undefined && sessionExpiresAt <= now) {
    throw new Error("MANAGEMENT_SESSION_EXPIRED");
  }

  return {
    globalUserId: token.sub,
    email: typeof token.email === "string" ? token.email : "",
    sessionExpiresAt,
  };
}

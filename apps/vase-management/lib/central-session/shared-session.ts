import { decode } from "next-auth/jwt";
import {
  getCookieValue,
  localAuthCookieName,
  sharedAuthCookieName,
} from "@vase/auth";

function getCookieFamilyValue(
  cookieHeader: string | null,
  baseCookieName: string,
): string | null {
  const baseValue = getCookieValue(cookieHeader, baseCookieName);
  if (baseValue !== null) {
    return baseValue;
  }

  if (!cookieHeader) {
    return null;
  }

  const chunkPrefix = `${baseCookieName}.`;
  const chunks: Array<{ index: number; value: string }> = [];

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;

    const key = part.slice(0, separator).trim();
    if (!key.startsWith(chunkPrefix)) continue;

    const suffix = key.slice(chunkPrefix.length);
    if (!/^\d+$/.test(suffix)) continue;

    chunks.push({
      index: Number(suffix),
      value: decodeURIComponent(part.slice(separator + 1).trim()),
    });
  }

  if (chunks.length === 0) {
    return null;
  }

  return chunks
    .sort((left, right) => left.index - right.index)
    .map((chunk) => chunk.value)
    .join("");
}

export async function readSharedManagementSession(input: {
  cookieHeader: string | null;
  secret: string | undefined;
  now?: number;
}) {
  if (!input.secret) {
    throw new Error("MANAGEMENT_AUTH_SECRET_MISSING");
  }

  let cookieName: string;
  let encryptedToken: string | null;
  try {
    const sharedToken = getCookieFamilyValue(input.cookieHeader, sharedAuthCookieName);
    if (sharedToken !== null) {
      cookieName = sharedAuthCookieName;
      encryptedToken = sharedToken;
    } else {
      cookieName = localAuthCookieName;
      encryptedToken = getCookieFamilyValue(input.cookieHeader, localAuthCookieName);
    }
  } catch {
    throw new Error("MANAGEMENT_SESSION_INVALID");
  }

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

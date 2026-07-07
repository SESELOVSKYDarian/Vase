export type SharedSessionClaim = {
  globalUserId: string;
  email: string;
  globalTenantId?: string;
  sessionVersion: number;
};

export const sharedAuthCookieDomain = ".vase.ar";
export const sharedAuthCookieName = "__Secure-authjs.session-token";
export const localAuthCookieName = "authjs.session-token";

export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;

    const key = part.slice(0, separator).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return null;
}

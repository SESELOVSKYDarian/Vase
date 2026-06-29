export type SessionPreference = "day" | "remember";

export function getSessionDurationMs(
  preference: SessionPreference,
  options: { shortMs: number; rememberMs: number },
) {
  return preference === "day" ? options.shortMs : options.rememberMs;
}

type SessionLike =
  | {
      user?: { id?: string; isEmailVerified?: boolean } | null;
      sessionExpiresAt?: number;
    }
  | null
  | undefined;

export function hasActiveSession(session: SessionLike, now = Date.now()) {
  if (!session?.user) {
    return false;
  }

  if (!session.sessionExpiresAt) {
    return true;
  }

  return session.sessionExpiresAt > now;
}

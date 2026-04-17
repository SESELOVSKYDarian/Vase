import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { appConfig } from "@/config/app";
import { getSessionDurationMs, type SessionPreference } from "@/lib/auth/session";
import type { PlatformRole } from "@/lib/auth/roles";

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
  sessionPreference: z.enum(["day", "remember"]).default("day"),
});

function coercePlatformRole(value: unknown): PlatformRole {
  return value === "SUPER_ADMIN" || value === "SUPPORT" || value === "USER"
    ? value
    : "USER";
}

function coerceSessionPreference(value: unknown): SessionPreference {
  return value === "remember" ? "remember" : "day";
}

function resolveSessionExpiresAt(token: {
  iat?: number;
  sessionPreference?: string;
}) {
  const sessionPreference = coerceSessionPreference(token.sessionPreference);
  const baseTimestampMs = typeof token.iat === "number" ? token.iat * 1000 : Date.now();

  return (
    baseTimestampMs +
    getSessionDurationMs(sessionPreference, {
      shortMs: appConfig.security.shortSessionMaxAgeSeconds * 1000,
      rememberMs: appConfig.security.rememberSessionMaxAgeSeconds * 1000,
    })
  );
}

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: appConfig.security.authSessionMaxAgeSeconds,
    updateAge: 60 * 30, // 30 minutes
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    Credentials({
      async authorize(rawCredentials) {
        // In auth.ts (server-side), we'll override this with a version that actually checks the DB.
        // This config is mostly for middleware and shared metadata.
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        token.platformRole = coercePlatformRole(user.platformRole);
        token.locale = typeof user.locale === "string" ? user.locale : "es";
        token.emailVerified =
          "emailVerified" in user ? Boolean(user.emailVerified) : Boolean(token.emailVerified);
        token.sessionPreference = coerceSessionPreference(
          "sessionPreference" in user ? user.sessionPreference : token.sessionPreference,
        );
        token.sessionExpiresAt =
          Date.now() +
          getSessionDurationMs(coerceSessionPreference(token.sessionPreference), {
            shortMs: appConfig.security.shortSessionMaxAgeSeconds * 1000,
            rememberMs: appConfig.security.rememberSessionMaxAgeSeconds * 1000,
          });
      } else if (!token.sessionExpiresAt) {
        token.sessionPreference = coerceSessionPreference(token.sessionPreference);
        token.sessionExpiresAt = resolveSessionExpiresAt(token);
      }

      // Note: Full data refresh from DB happens in src/auth.ts extending this config.
      return token;
    },
    session({ session, token }) {
      const platformRole = coercePlatformRole(token.platformRole);
      const locale = typeof token.locale === "string" ? token.locale : "es";
      const sessionPreference = coerceSessionPreference(token.sessionPreference);

      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.platformRole = platformRole;
        session.user.locale = locale;
        session.user.isEmailVerified = Boolean(token.emailVerified);
        session.user.sessionPreference = sessionPreference;
      }

      session.sessionPreference = sessionPreference;
      session.sessionExpiresAt =
        typeof token.sessionExpiresAt === "number" ? token.sessionExpiresAt : undefined;

      return session;
    },
    authorized({ auth: currentAuth, request }) {
      const isSignedIn = !!currentAuth?.user;
      const isSessionActive =
        typeof currentAuth?.sessionExpiresAt === "number"
          ? currentAuth.sessionExpiresAt > Date.now()
          : isSignedIn;

      if (request.nextUrl.pathname.startsWith("/app")) {
        return isSignedIn && isSessionActive && Boolean(currentAuth?.user?.isEmailVerified);
      }

      return true;
    },
  },
  pages: {
    signIn: "/signin",
  },
  trustHost: true,
} satisfies NextAuthConfig;

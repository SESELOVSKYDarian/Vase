import type { CookiesOptions } from "@auth/core/types";

type AuthCookieEnvironment = {
  AUTH_COOKIE_DOMAIN?: string;
  NODE_ENV?: string;
};

const DEFAULT_PRODUCTION_COOKIE_DOMAIN = ".vase.ar";
const SHARED_SESSION_COOKIE_NAME = "__Secure-authjs.session-token";

function normalizeCookieDomain(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? new URL(trimmed).hostname
      : trimmed.replace(/\/+$/, "").split(":")[0];

    if (!parsed) {
      return undefined;
    }

    return parsed.startsWith(".") ? parsed : `.${parsed}`;
  } catch {
    return undefined;
  }
}

export function resolveAuthCookieDomain(env: AuthCookieEnvironment = process.env) {
  const configured = normalizeCookieDomain(env.AUTH_COOKIE_DOMAIN ?? "");

  if (configured) {
    return configured;
  }

  return env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_COOKIE_DOMAIN : undefined;
}

export function createAuthCookiesConfig(
  env: AuthCookieEnvironment = process.env,
): Partial<CookiesOptions> | undefined {
  const domain = resolveAuthCookieDomain(env);

  if (!domain) {
    return undefined;
  }

  return {
    sessionToken: {
      name: SHARED_SESSION_COOKIE_NAME,
      options: {
        domain,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  };
}

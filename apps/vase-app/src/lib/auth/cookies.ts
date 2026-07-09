import type { CookiesOptions } from "@auth/core/types";
import { sharedAuthCookieName } from "@vase/auth";

type AuthCookieEnvironment = {
  AUTH_COOKIE_DOMAIN?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
  VASE_LABS_HOST?: string;
  VASE_PRIMARY_HOST?: string;
};

const DEFAULT_PRODUCTION_COOKIE_DOMAIN = ".vase.ar";

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

function isVaseProductionHost(value: string | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  try {
    const host = normalized.startsWith("http://") || normalized.startsWith("https://")
      ? new URL(normalized).hostname
      : normalized.replace(/\/+$/, "").split(":")[0];

    return host === "vase.ar" || host.endsWith(".vase.ar");
  } catch {
    return false;
  }
}

export function resolveAuthCookieDomain(env: AuthCookieEnvironment = process.env) {
  const configured = normalizeCookieDomain(env.AUTH_COOKIE_DOMAIN ?? "");

  if (configured) {
    return configured;
  }

  const usesVaseProductionHost =
    isVaseProductionHost(env.NEXT_PUBLIC_APP_URL) ||
    isVaseProductionHost(env.VASE_PRIMARY_HOST) ||
    isVaseProductionHost(env.VASE_LABS_HOST);

  return env.NODE_ENV === "production" || usesVaseProductionHost ? DEFAULT_PRODUCTION_COOKIE_DOMAIN : undefined;
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
      name: sharedAuthCookieName,
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

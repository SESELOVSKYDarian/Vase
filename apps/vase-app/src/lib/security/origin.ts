import { appConfig } from "@/config/app";

const productionAppOrigin = "https://app.vase.ar";

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "").toLowerCase();
}

export function getTrustedOrigins() {
  return appConfig.security.trustedOrigins.map(normalizeOrigin);
}

export function isTrustedOrigin(origin: string) {
  const normalized = normalizeOrigin(origin);
  return getTrustedOrigins().includes(normalized);
}

export function getCanonicalOrigin() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) {
    try {
      const url = new URL(configured);
      const isInternalHost =
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "0.0.0.0";

      if (process.env.NODE_ENV === "production" && isInternalHost) {
        return productionAppOrigin;
      }

      return normalizeOrigin(url.origin);
    } catch {
      return process.env.NODE_ENV === "production"
        ? productionAppOrigin
        : "http://localhost:3002";
    }
  }

  return process.env.NODE_ENV === "production"
    ? productionAppOrigin
    : getTrustedOrigins()[0] ?? "http://localhost:3002";
}

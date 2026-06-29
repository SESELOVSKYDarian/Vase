import { appConfig } from "@/config/app";

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
    return normalizeOrigin(configured);
  }
  return getTrustedOrigins()[0] ?? "http://localhost:3002";
}

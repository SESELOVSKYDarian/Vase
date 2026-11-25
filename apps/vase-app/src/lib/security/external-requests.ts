import { isIP } from "node:net";
import { appConfig } from "@/config/app";

const PRIVATE_IPV4_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
] as const;

const PRIVATE_HOSTNAMES = new Set(["localhost", "metadata", "metadata.google.internal"]);

function isPrivateIpv4(hostname: string) {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname));
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

export function assertSafeExternalUrl(rawUrl: string, options?: { allowHttp?: boolean }) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("INVALID_EXTERNAL_URL");
  }

  const protocolAllowed =
    url.protocol === "https:" || (options?.allowHttp && url.protocol === "http:");

  if (!protocolAllowed) {
    throw new Error("EXTERNAL_URL_PROTOCOL_NOT_ALLOWED");
  }

  const hostname = url.hostname.toLowerCase();

  if (PRIVATE_HOSTNAMES.has(hostname)) {
    throw new Error("EXTERNAL_URL_PRIVATE_HOST");
  }

  const ipVersion = isIP(hostname);

  if ((ipVersion === 4 && isPrivateIpv4(hostname)) || (ipVersion === 6 && isPrivateIpv6(hostname))) {
    throw new Error("EXTERNAL_URL_PRIVATE_HOST");
  }

  if (url.username || url.password) {
    throw new Error("EXTERNAL_URL_CREDENTIALS_NOT_ALLOWED");
  }

  return url;
}

export function sanitizeAllowedPathList(rawValue?: string | null) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (!item.startsWith("/")) {
        throw new Error("SCRAPING_PATH_INVALID");
      }

      if (item.includes("..") || item.includes("//")) {
        throw new Error("SCRAPING_PATH_INVALID");
      }

      return item;
    });
}

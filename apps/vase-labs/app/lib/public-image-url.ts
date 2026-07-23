import { isIP } from "node:net";

const nonPublicHostSuffixes = [".example", ".internal", ".invalid", ".local", ".localhost", ".test"];

export function normalizePublicHttpsImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || !hostname
      || hostname.endsWith(".")
      || hostname === "localhost"
      || !hostname.includes(".")
      || isIP(hostname) !== 0
      || nonPublicHostSuffixes.some((suffix) => hostname.endsWith(suffix))
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

import { headers } from "next/headers";

export async function getRequestContext() {
  const requestHeaders = await headers();

  return {
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip") ??
      "unknown",
    userAgent: requestHeaders.get("user-agent"),
    host: requestHeaders.get("host") ?? "localhost:3000",
    protocol:
      requestHeaders.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "production" ? "https" : "http"),
  };
}

export function buildAbsoluteUrl(
  path: string,
  context: { host: string; protocol: string },
) {
  return `${context.protocol}://${context.host}${path}`;
}

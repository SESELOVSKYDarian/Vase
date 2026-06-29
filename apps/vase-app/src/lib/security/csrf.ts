import { isTrustedOrigin } from "@/lib/security/origin";

export function assertSameOrigin(request: Request) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return;
  }

  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");

  if (!origin || !host) {
    throw new Error("CSRF_VALIDATION_FAILED");
  }

  if (!isTrustedOrigin(origin)) {
    throw new Error("CSRF_VALIDATION_FAILED");
  }

  const originUrl = new URL(origin);
  const expectedOrigin = `${forwardedProto}://${host}`.toLowerCase();

  if (originUrl.origin.toLowerCase() !== expectedOrigin) {
    throw new Error("CSRF_VALIDATION_FAILED");
  }
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { managementSsoClaimsSchema, type ManagementSsoClaims, type ServiceHealth, type VaseServiceKey } from "@vase/contracts";

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signSsoPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createManagementSsoTicket(claims: ManagementSsoClaims, secret: string) {
  if (secret.length < 16) throw new Error("SSO_SECRET_NOT_CONFIGURED");
  const payload = encodeBase64Url(JSON.stringify(managementSsoClaimsSchema.parse(claims)));
  return `${payload}.${signSsoPayload(payload, secret)}`;
}

export function verifyManagementSsoTicket(ticket: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (secret.length < 16) throw new Error("SSO_SECRET_NOT_CONFIGURED");
  const [payload, signature, extra] = ticket.split(".");
  if (!payload || !signature || extra) throw new Error("INVALID_SSO_TICKET");
  const expected = Buffer.from(signSsoPayload(payload, secret));
  const candidate = Buffer.from(signature);
  if (expected.length !== candidate.length || !timingSafeEqual(expected, candidate)) throw new Error("INVALID_SSO_TICKET");
  try {
    const claims = managementSsoClaimsSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (claims.expiresAt < nowSeconds) throw new Error("EXPIRED_SSO_TICKET");
    return claims;
  } catch (error) {
    if (error instanceof Error && error.message === "EXPIRED_SSO_TICKET") throw error;
    throw new Error("INVALID_SSO_TICKET");
  }
}

export function assertServiceToken(authorization: string | null, expectedToken: string | undefined) {
  if (!expectedToken) {
    throw new Error("SERVICE_TOKEN_NOT_CONFIGURED");
  }

  const candidate = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (candidate !== expectedToken) {
    throw new Error("FORBIDDEN");
  }
}

export function createInternalAdminHealthPayload(input: {
  service: VaseServiceKey;
  domain: string;
  now?: Date;
}): ServiceHealth {
  return {
    service: input.service,
    domain: input.domain,
    status: "ok",
    timestamp: (input.now ?? new Date()).toISOString(),
  };
}

export function createHealthResponse(input: {
  service: VaseServiceKey;
  domain: string;
  checks?: Record<string, string>;
}) {
  return {
    ...createInternalAdminHealthPayload(input),
    checks: input.checks ?? { app: "ok" },
  };
}

export function createInternalAdminHealthResponse(input: {
  authorization: string | null;
  expectedToken: string | undefined;
  service: VaseServiceKey;
  domain: string;
}) {
  try {
    assertServiceToken(input.authorization, input.expectedToken);
    return {
      status: 200,
      body: createInternalAdminHealthPayload(input),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    return {
      status: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403,
      body: { error: message },
    };
  }
}

import type { ServiceHealth, VaseServiceKey } from "@vase/contracts";

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

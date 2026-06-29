import { performance } from "node:perf_hooks";
import type { NextRequest } from "next/server";
import {
  integrationResources,
  integrationResourceToScope,
  type IntegrationResource,
} from "@/config/integrations";
import { authenticateIntegrationRequest } from "@/lib/integrations/api-auth";
import { apiError, apiSuccess, createRequestId } from "@/lib/integrations/http";
import { getIntegrationResourcePayload } from "@/server/queries/integrations";
import { createIntegrationUsageLog } from "@/server/services/integration-audit";
import { createSecurityEvent } from "@/server/services/security-events";

function isIntegrationResource(value: string): value is IntegrationResource {
  return integrationResources.includes(value as IntegrationResource);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; resource: string }> },
) {
  const startedAt = performance.now();
  const requestId = createRequestId();
  const { tenantSlug, resource } = await params;

  if (!isIntegrationResource(resource)) {
    return apiError(404, "NOT_FOUND", "El recurso solicitado no existe.", requestId);
  }

  try {
    const scope = integrationResourceToScope[resource];
    const auth = await authenticateIntegrationRequest(tenantSlug, scope);
    const payload = getIntegrationResourcePayload(resource, tenantSlug);

    if (!payload) {
      return apiError(404, "NOT_FOUND", "No encontramos el recurso solicitado.", requestId);
    }

    const latencyMs = Math.round(performance.now() - startedAt);

    await createIntegrationUsageLog({
      tenantId: auth.tenantId,
      credentialId: auth.credentialId,
      requestId,
      route: request.nextUrl.pathname,
      method: request.method,
      scope,
      statusCode: 200,
      latencyMs,
      ipAddress: auth.requestContext.ipAddress,
      userAgent: auth.requestContext.userAgent,
    });

    return apiSuccess(payload, requestId, {
      "x-rate-limit-remaining": String(auth.rateLimit.remaining),
      "x-rate-limit-reset": auth.rateLimit.resetAt.toISOString(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status =
      code === "UNAUTHORIZED"
        ? 401
        : code === "FORBIDDEN_SCOPE"
          ? 403
          : code === "RATE_LIMIT_EXCEEDED"
            ? 429
            : 500;
    const message =
      code === "UNAUTHORIZED"
        ? "La API key es invalida, expiro o fue revocada."
        : code === "FORBIDDEN_SCOPE"
          ? "La credencial no tiene permisos sobre este recurso."
          : code === "RATE_LIMIT_EXCEEDED"
            ? "Se alcanzo el limite de consumo para la ventana activa."
          : "No pudimos procesar la solicitud.";

    if (status === 401 || status === 403 || status === 429) {
      await createSecurityEvent({
        event: "integration_request_denied",
        severity: status === 429 ? "medium" : "high",
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("x-real-ip") ??
          "unknown",
        userAgent: request.headers.get("user-agent"),
        metadata: {
          code,
          tenantSlug,
          resource,
          requestId,
        },
      });
    }

    return apiError(status, status === 500 ? "INTERNAL_ERROR" : code as never, message, requestId);
  }
}

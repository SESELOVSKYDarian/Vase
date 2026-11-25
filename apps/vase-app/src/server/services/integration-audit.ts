import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";

type IntegrationUsagePayload = {
  tenantId: string;
  credentialId?: string;
  requestId: string;
  route: string;
  method: string;
  scope: string;
  statusCode: number;
  latencyMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createIntegrationUsageLog(payload: IntegrationUsagePayload) {
  await prisma.integrationUsageLog.create({
    data: {
      tenantId: payload.tenantId,
      credentialId: payload.credentialId,
      requestId: payload.requestId,
      route: payload.route,
      method: payload.method,
      scope: payload.scope,
      statusCode: payload.statusCode,
      latencyMs: payload.latencyMs,
      ipAddress: payload.ipAddress ?? undefined,
      userAgent: payload.userAgent ?? undefined,
    },
  });
}

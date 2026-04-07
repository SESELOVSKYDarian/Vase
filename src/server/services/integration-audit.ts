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

type IntegrationAuditPayload = {
  tenantId: string;
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createIntegrationAudit(payload: IntegrationAuditPayload) {
  await createAuditLog({
    tenantId: payload.tenantId,
    actorUserId: payload.actorUserId,
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId,
    metadata: payload.metadata,
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
  });
}

import { createAuditLog } from "@/server/services/audit-log";

type SecurityEventPayload = {
  event: string;
  severity: "low" | "medium" | "high" | "critical";
  actorUserId?: string;
  tenantId?: string;
  targetId?: string;
  targetType?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createSecurityEvent(payload: SecurityEventPayload) {
  await createAuditLog({
    action: `security.${payload.event}`,
    targetType: payload.targetType ?? "security_event",
    targetId: payload.targetId,
    tenantId: payload.tenantId,
    actorUserId: payload.actorUserId,
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
    metadata: {
      severity: payload.severity,
      ...payload.metadata,
    },
  });
}

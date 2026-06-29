import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logEvent } from "@/lib/observability/logger";

type AuditPayload = {
  action: string;
  targetType: string;
  targetId?: string;
  tenantId?: string;
  actorUserId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAuditLog(payload: AuditPayload) {
  await prisma.auditLog.create({
    data: {
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      ipAddress: payload.ipAddress ?? undefined,
      userAgent: payload.userAgent ?? undefined,
      metadata: payload.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  logEvent({
    event: "audit.log_created",
    message: `Audit event persisted: ${payload.action}`,
    tenantId: payload.tenantId,
    userId: payload.actorUserId,
    metadata: {
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
    },
  });
}

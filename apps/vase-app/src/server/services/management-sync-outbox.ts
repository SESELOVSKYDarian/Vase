import { prisma } from "@/lib/db/prisma";
import { resolveManagementOrigin } from "@/lib/management/links";

function retryDelay(attempt: number) { return Math.min(15 * 60_000, 5_000 * 2 ** Math.max(0, attempt - 1)); }

export async function processPlatformManagementOutbox(limit = 25) {
  const rows = await prisma.platformSyncEvent.findMany({ where: { destination: "MANAGEMENT", status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: limit });
  for (const row of rows) {
    try {
      const response = await fetch(new URL("/api/internal/platform/events", resolveManagementOrigin()), { method: "POST", headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, "content-type": "application/json" }, body: JSON.stringify({ eventId: row.eventId, globalTenantId: row.tenantId, entity: row.entity, action: row.action, externalId: row.externalId, version: row.version, occurredAt: row.createdAt.toISOString(), payload: row.payload }) });
      if (!response.ok) throw new Error(`MANAGEMENT_SYNC_${response.status}`);
      await prisma.platformSyncEvent.update({ where: { id: row.id }, data: { status: "COMPLETED", completedAt: new Date(), lastError: null } });
    } catch (error) {
      const attempts = row.attempts + 1;
      await prisma.platformSyncEvent.update({ where: { id: row.id }, data: { status: "FAILED", attempts, nextAttemptAt: new Date(Date.now() + retryDelay(attempts)), lastError: String(error instanceof Error ? error.message : error).slice(0, 500) } });
    }
  }
  return rows.length;
}

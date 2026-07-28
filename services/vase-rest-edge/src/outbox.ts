import type { EdgeDatabase } from "./db.js";

export type OutboxEntry = {
  sequence: number;
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  eventType: string;
  actorId: string;
  deviceId: string;
  idempotencyKey: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export function pendingOutbox(database: EdgeDatabase, limit = 100): OutboxEntry[] {
  const rows = database.raw.prepare(`
    SELECT o.sequence, e.event_id, e.aggregate_type, e.aggregate_id,
           e.aggregate_version, e.event_type, e.actor_id, e.device_id,
           e.idempotency_key, e.occurred_at, e.payload_json
    FROM outbox o JOIN local_event e ON e.event_id = o.event_id
    WHERE o.state = 'PENDING' AND o.next_attempt_at <= ?
    ORDER BY o.sequence ASC LIMIT ?
  `).all(new Date().toISOString(), limit) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    sequence: Number(row.sequence),
    eventId: String(row.event_id),
    aggregateType: String(row.aggregate_type),
    aggregateId: String(row.aggregate_id),
    aggregateVersion: Number(row.aggregate_version),
    eventType: String(row.event_type),
    actorId: String(row.actor_id),
    deviceId: String(row.device_id),
    idempotencyKey: String(row.idempotency_key),
    occurredAt: String(row.occurred_at),
    payload: JSON.parse(String(row.payload_json)),
  }));
}

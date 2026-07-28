import { z } from "zod";
import type { EdgeDatabase } from "./db.js";

const commandSchema = z.object({
  eventId: z.string().min(1), aggregateType: z.string().min(1),
  aggregateId: z.string().min(1), expectedVersion: z.number().int().nonnegative(),
  eventType: z.string().min(1), actorId: z.string().min(1), deviceId: z.string().min(1),
  idempotencyKey: z.string().min(1), payload: z.record(z.string(), z.unknown()),
}).strict();

export function acceptLocalCommand(database: EdgeDatabase, raw: unknown) {
  const input = commandSchema.parse(raw);
  const duplicate = database.raw.prepare(
    "SELECT event_id FROM local_event WHERE idempotency_key = ?",
  ).get(input.idempotencyKey) as { event_id: string } | undefined;
  if (duplicate) return { eventId: duplicate.event_id, duplicate: true };
  const aggregate = database.raw.prepare(`
    SELECT version, state_json FROM aggregate_state
    WHERE aggregate_type = ? AND aggregate_id = ?
  `).get(input.aggregateType, input.aggregateId) as {
    version: number; state_json: string;
  } | undefined;
  const version = aggregate?.version ?? 0;
  if (version !== input.expectedVersion) throw new Error("EDGE_AGGREGATE_VERSION_CONFLICT");
  const nextVersion = version + 1;
  const occurredAt = new Date().toISOString();
  database.raw.exec("BEGIN IMMEDIATE");
  try {
    database.raw.prepare(`
      INSERT INTO aggregate_state(
        aggregate_type, aggregate_id, version, state_json, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(aggregate_type, aggregate_id) DO UPDATE SET
        version = excluded.version, state_json = excluded.state_json, updated_at = excluded.updated_at
    `).run(
      input.aggregateType, input.aggregateId, nextVersion,
      JSON.stringify(input.payload), occurredAt,
    );
    database.raw.prepare(`
      INSERT INTO local_event(
        event_id, aggregate_type, aggregate_id, aggregate_version, event_type,
        actor_id, device_id, idempotency_key, payload_json, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.eventId, input.aggregateType, input.aggregateId, nextVersion,
      input.eventType, input.actorId, input.deviceId, input.idempotencyKey,
      JSON.stringify(input.payload), occurredAt,
    );
    database.raw.prepare(`
      INSERT INTO outbox(event_id, state, next_attempt_at)
      VALUES (?, 'PENDING', ?)
    `).run(input.eventId, occurredAt);
    database.raw.exec("COMMIT");
  } catch (error) {
    database.raw.exec("ROLLBACK");
    throw error;
  }
  return { eventId: input.eventId, aggregateVersion: nextVersion, duplicate: false };
}

import type { EdgeDatabase } from "./db.js";
import { pendingOutbox } from "./outbox.js";
import { verify } from "node:crypto";
import { z } from "zod";

type Receipt = {
  eventId: string;
  status: "ACCEPTED" | "CONFLICT" | "REJECTED";
  aggregateVersion: number;
  expectedVersion?: number;
  code?: string;
};

export async function syncOnce(database: EdgeDatabase, input: {
  upload(events: ReturnType<typeof pendingOutbox>): Promise<{ receipts: Receipt[] }>;
  batchSize?: number;
}) {
  const entries = pendingOutbox(database, input.batchSize ?? 100);
  if (!entries.length) return { uploaded: 0, acknowledged: 0 };
  let result: { receipts: Receipt[] };
  try {
    result = await input.upload(entries);
  } catch (error) {
    const next = new Date(Date.now() + 5_000).toISOString();
    for (const entry of entries) {
      database.raw.prepare(`
        UPDATE outbox SET attempts = attempts + 1, next_attempt_at = ?, last_error = ?
        WHERE event_id = ? AND state = 'PENDING'
      `).run(next, error instanceof Error ? error.message : "SYNC_FAILED", entry.eventId);
    }
    throw error;
  }
  const byId = new Map(result.receipts.map((receipt) => [receipt.eventId, receipt]));
  database.raw.exec("BEGIN IMMEDIATE");
  try {
    for (const entry of entries) {
      const receipt = byId.get(entry.eventId);
      if (!receipt) continue;
      if (receipt.status === "ACCEPTED") {
        database.raw.prepare(`
          UPDATE outbox SET state = 'ACKNOWLEDGED', acknowledged_at = ?, last_error = NULL
          WHERE event_id = ?
        `).run(new Date().toISOString(), entry.eventId);
      } else if (receipt.status === "CONFLICT") {
        database.raw.prepare(`
          UPDATE outbox SET state = 'CONFLICT', last_error = ?
          WHERE event_id = ?
        `).run(JSON.stringify(receipt), entry.eventId);
      } else {
        database.raw.prepare(`
          UPDATE outbox SET state = 'REJECTED', last_error = ?
          WHERE event_id = ?
        `).run(receipt.code ?? "REJECTED", entry.eventId);
      }
    }
    database.raw.exec("COMMIT");
  } catch (error) {
    database.raw.exec("ROLLBACK");
    throw error;
  }
  return {
    uploaded: entries.length,
    acknowledged: result.receipts.filter((receipt) => receipt.status === "ACCEPTED").length,
  };
}

const configSchema = z.object({
  revision: z.number().int().positive(),
  generatedAt: z.iso.datetime(),
  policies: z.array(z.object({
    family: z.string().min(1), scopeType: z.string().min(1), scopeId: z.string().min(1),
    revision: z.number().int().positive(),
    value: z.record(z.string(), z.unknown()),
  }).strict()),
}).strict();

export function applySignedConfigDelta(database: EdgeDatabase, input: {
  payload: unknown;
  signature: string;
  cloudPublicKey: string;
}) {
  const payload = configSchema.parse(input.payload);
  if (!verify(
    null,
    Buffer.from(JSON.stringify(payload)),
    input.cloudPublicKey,
    Buffer.from(input.signature, "base64url"),
  )) throw new Error("EDGE_CONFIG_SIGNATURE_INVALID");
  database.raw.exec("BEGIN IMMEDIATE");
  try {
    const statement = database.raw.prepare(`
      INSERT INTO config_projection(
        family, scope_type, scope_id, revision, value_json, signature, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(family, scope_type, scope_id) DO UPDATE SET
        revision = excluded.revision, value_json = excluded.value_json,
        signature = excluded.signature, applied_at = excluded.applied_at
      WHERE excluded.revision > config_projection.revision
    `);
    for (const policy of payload.policies) {
      statement.run(
        policy.family, policy.scopeType, policy.scopeId, policy.revision,
        JSON.stringify(policy.value), input.signature, new Date().toISOString(),
      );
    }
    database.raw.exec("COMMIT");
  } catch (error) {
    database.raw.exec("ROLLBACK");
    throw error;
  }
}

export function applySnapshots(database: EdgeDatabase, snapshots: Array<{
  aggregateType: string;
  aggregateId: string;
  version: number;
  state: Record<string, unknown>;
}>) {
  database.raw.exec("BEGIN IMMEDIATE");
  try {
    const statement = database.raw.prepare(`
      INSERT INTO aggregate_state(
        aggregate_type, aggregate_id, version, state_json, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(aggregate_type, aggregate_id) DO UPDATE SET
        version = excluded.version, state_json = excluded.state_json, updated_at = excluded.updated_at
      WHERE excluded.version >= aggregate_state.version
    `);
    for (const snapshot of snapshots) {
      statement.run(
        snapshot.aggregateType, snapshot.aggregateId, snapshot.version,
        JSON.stringify(snapshot.state), new Date().toISOString(),
      );
    }
    database.raw.exec("COMMIT");
  } catch (error) {
    database.raw.exec("ROLLBACK");
    throw error;
  }
}

export function createCloudUploader(input: {
  globalTenantId: string;
  branchId: string;
  installationId: string;
  certificateFingerprint: string;
  syncUrl: string;
  fetcher: typeof fetch;
  heartbeat(): {
    agentVersion: string;
    pendingEventCount: number;
    failedPrintJobCount: number;
    lastCloudSyncAt: string | null;
    lastErrorCode: string | null;
  };
}) {
  return async (entries: ReturnType<typeof pendingOutbox>) => {
    const response = await input.fetcher(input.syncUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-vase-edge-installation-id": input.installationId,
        "x-vase-client-cert-fingerprint": input.certificateFingerprint,
      },
      body: JSON.stringify({
        events: entries.map(({ sequence, ...entry }) => {
          void sequence;
          return {
            ...entry,
            globalTenantId: input.globalTenantId,
            branchId: input.branchId,
            installationId: input.installationId,
          };
        }),
        heartbeat: input.heartbeat(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(
      typeof body.error === "string" ? body.error : "EDGE_SYNC_FAILED",
    );
    return body as {
      receipts: Receipt[];
      snapshots: Array<{
        aggregateType: string; aggregateId: string; version: number;
        state: Record<string, unknown>;
      }>;
      configDelta: { payload: unknown; signature: string; algorithm: string };
    };
  };
}

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openEdgeDatabase } from "../src/db.js";
import { acceptLocalCommand } from "../src/events.js";
import { pendingOutbox } from "../src/outbox.js";
import { syncOnce } from "../src/sync-client.js";
import { applySignedConfigDelta, applySnapshots } from "../src/sync-client.js";
import { generateKeyPairSync, sign } from "node:crypto";

const cleanup: string[] = [];
afterEach(async () => {
  for (const path of cleanup.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("Rest Edge durable sync", () => {
  it("commits local aggregate and outbox together and orders uploads", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    acceptLocalCommand(database, {
      eventId: "e1", aggregateType: "ORDER", aggregateId: "o1",
      expectedVersion: 0, eventType: "OPENED", actorId: "s1", deviceId: "d1",
      idempotencyKey: "c1", payload: { status: "OPEN" },
    });
    acceptLocalCommand(database, {
      eventId: "e2", aggregateType: "ORDER", aggregateId: "o1",
      expectedVersion: 1, eventType: "ITEM_ADDED", actorId: "s1", deviceId: "d1",
      idempotencyKey: "c2", payload: { items: 1 },
    });
    expect(pendingOutbox(database).map((entry) => entry.eventId)).toEqual(["e1", "e2"]);
    expect(() => acceptLocalCommand(database, {
      eventId: "e3", aggregateType: "ORDER", aggregateId: "o1",
      expectedVersion: 0, eventType: "STALE", actorId: "s1", deviceId: "d1",
      idempotencyKey: "c3", payload: {},
    })).toThrow("EDGE_AGGREGATE_VERSION_CONFLICT");
    database.close();
  });

  it("acknowledges partial batches and retries remaining events after restart", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    let database = openEdgeDatabase({ dataDir: dir });
    for (const [index, id] of ["e1", "e2"].entries()) {
      acceptLocalCommand(database, {
        eventId: id, aggregateType: "ORDER", aggregateId: `o${index}`,
        expectedVersion: 0, eventType: "OPENED", actorId: "s1", deviceId: "d1",
        idempotencyKey: `c${index}`, payload: {},
      });
    }
    const upload = vi.fn(async () => ({
      receipts: [{ eventId: "e1", status: "ACCEPTED" as const, aggregateVersion: 1 }],
    }));
    await syncOnce(database, { upload });
    expect(pendingOutbox(database).map((entry) => entry.eventId)).toEqual(["e2"]);
    database.close();
    database = openEdgeDatabase({ dataDir: dir });
    expect(pendingOutbox(database).map((entry) => entry.eventId)).toEqual(["e2"]);
    database.close();
  });

  it("verifies config deltas and restores signed cloud snapshots after conflict", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-sync-"));
    cleanup.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    const keys = generateKeyPairSync("ed25519");
    const payload = {
      revision: 7, generatedAt: new Date().toISOString(),
      policies: [{
        family: "PRICING", scopeType: "BRANCH", scopeId: "branch_1",
        revision: 3, value: { taxIncluded: true },
      }],
    };
    applySignedConfigDelta(database, {
      payload,
      signature: sign(null, Buffer.from(JSON.stringify(payload)), keys.privateKey).toString("base64url"),
      cloudPublicKey: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
    });
    expect(database.raw.prepare("SELECT revision FROM config_projection WHERE family = 'PRICING'")
      .get()).toEqual({ revision: 3 });
    applySnapshots(database, [{
      aggregateType: "ORDER", aggregateId: "o1", version: 8, state: { status: "READY" },
    }]);
    expect(database.raw.prepare(
      "SELECT version FROM aggregate_state WHERE aggregate_type = 'ORDER' AND aggregate_id = 'o1'",
    ).get()).toEqual({ version: 8 });
    database.close();
  });
});

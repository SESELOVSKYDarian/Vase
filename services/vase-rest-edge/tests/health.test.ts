import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openEdgeDatabase } from "../src/db.js";
import { readEdgeConfig } from "../src/config.js";
import { edgeHealth } from "../src/health.js";

const cleanups: string[] = [];
afterEach(async () => {
  for (const path of cleanups.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("Vase Rest Edge foundation", () => {
  it("initializes SQLite WAL and a transactional migration ledger", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vase-rest-edge-"));
    cleanups.push(dir);
    const database = openEdgeDatabase({ dataDir: dir });
    expect(database.pragma("journal_mode")).toBe("wal");
    expect(database.migrations()).toContain("001_foundation");
    database.close();

    const reopened = openEdgeDatabase({ dataDir: dir });
    expect(reopened.migrations()).toEqual(["001_foundation"]);
    reopened.close();
  });

  it("rejects a second writer and releases the lock on clean shutdown", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vase-rest-edge-"));
    cleanups.push(dir);
    const first = openEdgeDatabase({ dataDir: dir });
    expect(() => openEdgeDatabase({ dataDir: dir })).toThrow("EDGE_WRITER_LOCKED");
    first.close();
    const restarted = openEdgeDatabase({ dataDir: dir });
    restarted.close();
  });

  it("requires local TLS and completed enrollment", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vase-rest-edge-"));
    cleanups.push(dir);
    expect(() => readEdgeConfig({
      EDGE_DATA_DIR: dir,
      EDGE_HOST: "0.0.0.0",
      EDGE_PORT: "3443",
    })).toThrow("EDGE_TLS_REQUIRED");

    await writeFile(join(dir, "server.key"), "private");
    await writeFile(join(dir, "server.crt"), "certificate");
    const config = readEdgeConfig({
      EDGE_DATA_DIR: dir,
      EDGE_HOST: "0.0.0.0",
      EDGE_PORT: "3443",
      EDGE_TLS_KEY_PATH: join(dir, "server.key"),
      EDGE_TLS_CERT_PATH: join(dir, "server.crt"),
    });
    const database = openEdgeDatabase({ dataDir: dir });
    expect(edgeHealth(config, database).status).toBe("unpaired");
    database.close();
  });
});

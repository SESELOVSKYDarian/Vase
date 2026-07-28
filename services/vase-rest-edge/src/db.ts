import { mkdirSync, openSync, closeSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type EdgeDatabase = {
  raw: DatabaseSync;
  pragma(name: "journal_mode"): string;
  migrations(): string[];
  close(): void;
};

export function openEdgeDatabase(input: { dataDir: string }): EdgeDatabase {
  mkdirSync(input.dataDir, { recursive: true, mode: 0o700 });
  const lockPath = join(input.dataDir, "writer.lock");
  let lock: number;
  try {
    lock = openSync(lockPath, "wx", 0o600);
  } catch {
    throw new Error("EDGE_WRITER_LOCKED");
  }
  let database: DatabaseSync;
  try {
    database = new DatabaseSync(join(input.dataDir, "vase-rest-edge.sqlite"));
    database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);
    const applied = database.prepare(
      "SELECT version FROM schema_migration WHERE version = ?",
    ).get("001_foundation");
    if (!applied) {
      const schemaSql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
      database.exec("BEGIN IMMEDIATE");
      try {
        database.exec(schemaSql);
        database.prepare(
          "INSERT INTO schema_migration(version, applied_at) VALUES (?, ?)",
        ).run("001_foundation", new Date().toISOString());
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
  } catch (error) {
    closeSync(lock);
    unlinkSync(lockPath);
    throw error;
  }
  let closed = false;
  return {
    raw: database,
    pragma() {
      const row = database.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
      return row.journal_mode.toLowerCase();
    },
    migrations() {
      return (database.prepare(
        "SELECT version FROM schema_migration ORDER BY version",
      ).all() as Array<{ version: string }>).map((row) => row.version);
    },
    close() {
      if (closed) return;
      closed = true;
      database.close();
      closeSync(lock);
      unlinkSync(lockPath);
    },
  };
}

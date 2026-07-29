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
    const migrations = [
      {
        version: "001_foundation",
        sql: readFileSync(new URL("./schema.sql", import.meta.url), "utf8"),
      },
      {
        version: "002_staff_pin_lockout",
        sql: `
          ALTER TABLE staff_projection ADD COLUMN failed_pin_attempts INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE staff_projection ADD COLUMN locked_until TEXT;
        `,
      },
      {
        version: "003_runtime_metadata",
        sql: `
          CREATE TABLE edge_runtime (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `,
      },
      {
        version: "004_printer_configuration",
        sql: `
          CREATE TABLE printer (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            connection_type TEXT NOT NULL,
            connection_json TEXT NOT NULL,
            routes_json TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL
          );
        `,
      },
    ];
    for (const migration of migrations) {
      const applied = database.prepare(
        "SELECT version FROM schema_migration WHERE version = ?",
      ).get(migration.version);
      if (applied) continue;
      database.exec("BEGIN IMMEDIATE");
      try {
        database.exec(migration.sql);
        database.prepare(
          "INSERT INTO schema_migration(version, applied_at) VALUES (?, ?)",
        ).run(migration.version, new Date().toISOString());
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

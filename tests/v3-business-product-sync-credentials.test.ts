import { describe, expect, it, vi } from "vitest";
import { ensureProductSyncToken } from "../apps/vase-editor/server/src/services/productSyncCredentials.js";

function database(existing?: Record<string, unknown>) {
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
    if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
    if (sql.includes("select id, name, token_hash")) return { rows: existing ? [existing] : [] };
    if (sql.includes("insert into api_tokens")) {
      return { rows: [{ id: "created", name: values?.[1], token_hash: values?.[2], scope: values?.[3] }] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query, release }));
  return { pool: { connect }, query, release };
}

describe("ensureProductSyncToken", () => {
  it("locks the tenant and reuses its existing Business credential", async () => {
    const existing = { id: "existing", token_hash: "vase_existing", scope: "products:sync" };
    const db = database(existing);

    await expect(ensureProductSyncToken(db.pool, "tenant-1")).resolves.toEqual({
      tokenRecord: existing,
      autoCreated: false,
    });

    expect(db.query.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      "select pg_advisory_xact_lock(hashtext($1))",
      expect.stringContaining("select id, name, token_hash"),
      "COMMIT",
    ]);
    expect(db.query).toHaveBeenNthCalledWith(2, "select pg_advisory_xact_lock(hashtext($1))", ["product-sync:tenant-1"]);
    expect(db.release).toHaveBeenCalledOnce();
  });

  it("creates and persists a credential in Business when none exists", async () => {
    const db = database();
    const result = await ensureProductSyncToken(db.pool, "tenant-2");

    expect(result.autoCreated).toBe(true);
    expect(result.tokenRecord).toMatchObject({ id: "created", name: "ERP Sync", scope: "products:sync" });
    expect(result.tokenRecord.token_hash).toMatch(/^vase_[a-f0-9]{48}$/);
    expect(db.query.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      "select pg_advisory_xact_lock(hashtext($1))",
      expect.stringContaining("select id, name, token_hash"),
      expect.stringContaining("insert into api_tokens"),
      "COMMIT",
    ]);
    expect(db.release).toHaveBeenCalledOnce();
  });

  it("rolls back and releases the connection when Business persistence fails", async () => {
    const release = vi.fn();
    const query = vi.fn(async (sql: string) => {
      if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
      if (sql.includes("pg_advisory_xact_lock")) throw new Error("database unavailable");
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const pool = { connect: vi.fn(async () => ({ query, release })) };

    await expect(ensureProductSyncToken(pool, "tenant-3")).rejects.toThrow("database unavailable");
    expect(query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });
});

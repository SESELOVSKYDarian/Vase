import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { withMysqlTenantLock } from "../apps/vase-labs/app/lib/mysql-tenant-lock";

function rawClient(results: unknown[]) {
  return {
    $queryRawUnsafe: vi.fn(async () => results.shift()),
  };
}

describe("Labs MySQL tenant lock", () => {
  it("locks the tenant's canonical assistant row on the provided transaction client", async () => {
    const client = rawClient([[{ id: "assistant-1" }]]);
    const operation = vi.fn(async () => "done");

    await expect(withMysqlTenantLock(client, "tenant-1", operation)).resolves.toBe("done");

    expect(client.$queryRawUnsafe).toHaveBeenCalledWith(
      "SELECT id FROM Assistant WHERE globalTenantId = ? ORDER BY createdAt, id LIMIT 1 FOR UPDATE",
      "tenant-1",
    );
    expect(client.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("leaves rollback and lock release to the surrounding transaction when the operation fails", async () => {
    const client = rawClient([[{ id: "assistant-1" }]]);

    await expect(withMysqlTenantLock(client, "tenant-1", async () => {
      throw new Error("OPERATION_FAILED");
    })).rejects.toThrow("OPERATION_FAILED");

    expect(client.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("fails without running the operation when the tenant has no assistant lock row", async () => {
    const client = rawClient([[]]);
    const operation = vi.fn(async () => "done");

    await expect(withMysqlTenantLock(client, "tenant-1", operation)).rejects.toThrow(
      "TENANT_LOCK_UNAVAILABLE",
    );
    expect(operation).not.toHaveBeenCalled();
    expect(client.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("removes PostgreSQL locking SQL and shares the MySQL helper across repositories", () => {
    const catalogSource = readFileSync(
      new URL("../apps/vase-labs/app/lib/catalog-repository.ts", import.meta.url),
      "utf8",
    );
    const knowledgeSource = readFileSync(
      new URL("../apps/vase-labs/app/lib/knowledge-repository.ts", import.meta.url),
      "utf8",
    );
    const combinedSource = `${catalogSource}\n${knowledgeSource}`;

    expect(combinedSource).not.toMatch(/pg_advisory|hashtext/i);
    expect(catalogSource).toContain("withMysqlTenantLock");
    expect(knowledgeSource).toContain("withMysqlTenantLock");
    expect(catalogSource).toContain('isolationLevel: "ReadCommitted"');
    expect(knowledgeSource).toContain('isolationLevel: "ReadCommitted"');
  });
});

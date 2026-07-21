import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AssistantSecret migration recovery", () => {
  it("inherits the database collation and repairs only the known empty partial table", () => {
    const migration = fs.readFileSync(path.resolve("apps/vase-labs/prisma/migrations/20260721091500_assistant_openai_key/migration.sql"), "utf8");
    const recovery = fs.readFileSync(path.resolve("apps/vase-labs/scripts/repair-assistant-secret-migration.js"), "utf8");
    const dockerfile = fs.readFileSync(path.resolve("apps/vase-labs/Dockerfile"), "utf8");

    expect(migration).not.toMatch(/COLLATE|CHARACTER SET/i);
    expect(recovery).toContain("20260721091500_assistant_openai_key");
    expect(recovery).toContain("AssistantSecret");
    expect(recovery).toContain("COUNT(*)");
    expect(recovery).toContain("migrate resolve --rolled-back");
    expect(recovery).toContain("table_name = '_prisma_migrations'");
    expect(recovery.indexOf("table_name = '_prisma_migrations'")).toBeLessThan(recovery.indexOf("SELECT migration_name"));
    expect(dockerfile).toContain("repair-assistant-secret-migration.js");
  });
});

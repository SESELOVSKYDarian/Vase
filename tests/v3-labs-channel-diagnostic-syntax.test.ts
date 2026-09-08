import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

describe("Labs channel diagnostic route", () => {
  it("has valid TypeScript syntax so a Labs deployment can build it", () => {
    const source = fs.readFileSync(
      path.resolve("apps/vase-labs/app/api/v1/channels/[tenantSlug]/test/route.ts"),
      "utf8",
    );
    const result = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      reportDiagnostics: true,
    });

    expect(result.diagnostics ?? []).toEqual([]);
  });
});

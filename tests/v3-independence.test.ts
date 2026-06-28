import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(".");
const forbiddenPatterns = [
  /from\s+["']@\/src/,
  /from\s+["']@\/v3/,
  /from\s+["']\.\.\/\.\.\/src/,
  /from\s+["']\.\.\/\.\.\/\.\.\/src/,
  /legacy[\\/]/,
];

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist"].includes(entry.name)) return [];
      return walkFiles(fullPath);
    }
    return /\.(ts|tsx|js|jsx|json|md|prisma)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("V3 app independence", () => {
  it("ignores generated dependency and build directories", () => {
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "vase-independence-"));

    try {
      fs.mkdirSync(path.join(fixtureDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(fixtureDir, "src", "valid.ts"), "export const valid = true;\n");

      for (const generatedDir of ["node_modules", ".next", "dist"]) {
        const generatedPath = path.join(fixtureDir, generatedDir);
        fs.mkdirSync(generatedPath, { recursive: true });
        fs.writeFileSync(path.join(generatedPath, "legacy.js"), "import '../../src/legacy';\n");
      }

      expect(walkFiles(fixtureDir).map((file) => path.relative(fixtureDir, file))).toEqual([
        path.join("src", "valid.ts"),
      ]);
    } finally {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it("keeps apps and packages free from monolith imports", () => {
    const files = [...walkFiles(path.join(rootDir, "apps")), ...walkFiles(path.join(rootDir, "packages"))];
    const violations = files.flatMap((file) => {
      const content = fs.readFileSync(file, "utf8");
      return forbiddenPatterns.some((pattern) => pattern.test(content)) ? [path.relative(rootDir, file)] : [];
    });

    expect(violations).toEqual([]);
  });
});

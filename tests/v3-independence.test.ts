import fs from "node:fs";
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
    if (entry.isDirectory()) return walkFiles(fullPath);
    return /\.(ts|tsx|js|jsx|json|md|prisma)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("V3 app independence", () => {
  it("keeps apps and packages free from monolith imports", () => {
    const files = [...walkFiles(path.join(rootDir, "apps")), ...walkFiles(path.join(rootDir, "packages"))];
    const violations = files.flatMap((file) => {
      const content = fs.readFileSync(file, "utf8");
      return forbiddenPatterns.some((pattern) => pattern.test(content)) ? [path.relative(rootDir, file)] : [];
    });

    expect(violations).toEqual([]);
  });
});

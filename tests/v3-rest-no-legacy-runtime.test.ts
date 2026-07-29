import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const activeRoots = [
  join(root, "apps", "vase-rest", "app"),
  join(root, "services", "vase-rest-edge", "src"),
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(?:ts|tsx|js|mjs|cjs)$/.test(name) ? [path] : [];
  });
}

describe("Vase Rest production runtime guard", () => {
  it("contains no legacy imports, Supabase client, fake success, or hard-coded legacy auth", () => {
    const forbidden = [
      /from\s+["'][^"']*(?:noctua|backend-reservas|Proyecto-Restaurante|supabase)[^"']*["']/i,
      /@supabase\/|createClient\s*\([^)]*SUPABASE/i,
      /admin\s*\/\s*1234|superadm_session|mocked_uber_eats_token/i,
      /simulated?\s+CAE|mock(?:Order|Store|Fallback)|sampleDelivery/i,
    ];
    const violations = activeRoots.flatMap(sourceFiles).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return forbidden.flatMap((pattern) =>
        pattern.test(source)
          ? [`${relative(root, path)} matched ${pattern}`]
          : []);
    });
    expect(violations).toEqual([]);
  });

  it("keeps preserved migration references outside the compiled Rest workspace", () => {
    const tsconfig = JSON.parse(readFileSync(
      join(root, "apps", "vase-rest", "tsconfig.json"),
      "utf8",
    )) as { include: string[]; exclude: string[] };
    expect(tsconfig.include).toContain("app/**/*.ts");
    expect(tsconfig.exclude).toEqual(expect.arrayContaining([
      "noctua",
      "backend-reservas",
      "Proyecto-Restaurante",
    ]));
    expect(tsconfig.include.some((entry) =>
      /noctua|backend-reservas|Proyecto-Restaurante|supabase/.test(entry))).toBe(false);
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { v3WorkspaceApps, v3WorkspacePackages } from "../packages/config/src/index";

const rootDir = path.resolve(".");

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8")) as Record<string, unknown>;
}

function readText(relativePath: string) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

describe("V3 workspace structure", () => {
  it("registers npm workspaces for apps and packages", () => {
    const packageJson = readJson("package.json");

    expect(packageJson.workspaces).toEqual(["apps/*", "packages/*"]);
  });

  it("defines the expected app extraction targets", () => {
    expect(v3WorkspaceApps.map((app) => app.key)).toEqual([
      "vase-portal",
      "vase-app",
      "vase-admin",
      "vase-help",
      "vase-business",
      "vase-management",
      "vase-labs",
      "vase-workplace",
    ]);
  });

  it("creates each V3 app with independent deploy files, health routes, and Postgres config", () => {
    for (const app of v3WorkspaceApps) {
      const base = path.join(rootDir, app.path);
      const appRouterBase =
        app.key === "vase-app"
          ? path.join(base, "src", "app")
          : path.join(base, "app");
      const rootPage =
        app.key === "vase-app"
          ? path.join(appRouterBase, "(marketing)", "page.tsx")
          : path.join(appRouterBase, "page.tsx");
      expect(fs.existsSync(path.join(base, "package.json")), `${app.path}/package.json`).toBe(true);
      expect(fs.existsSync(path.join(base, "tsconfig.json")), `${app.path}/tsconfig.json`).toBe(true);
      expect(fs.existsSync(path.join(base, "next.config.ts")), `${app.path}/next.config.ts`).toBe(true);
      expect(fs.existsSync(path.join(base, "Dockerfile")), `${app.path}/Dockerfile`).toBe(true);
      expect(fs.existsSync(path.join(base, ".env.example")), `${app.path}/.env.example`).toBe(true);
      expect(fs.existsSync(path.join(base, "README.md")), `${app.path}/README.md`).toBe(true);
      expect(fs.existsSync(rootPage), `${app.path}/app/page.tsx`).toBe(true);
      expect(
        fs.existsSync(path.join(appRouterBase, "api", "health", "live", "route.ts")),
        `${app.path}/app/api/health/live/route.ts`,
      ).toBe(true);
      expect(
        fs.existsSync(path.join(appRouterBase, "api", "health", "ready", "route.ts")),
        `${app.path}/app/api/health/ready/route.ts`,
      ).toBe(true);
      expect(
        fs.existsSync(path.join(appRouterBase, "api", "internal", "admin", "health", "route.ts")),
        `${app.path}/app/api/internal/admin/health/route.ts`,
      ).toBe(true);
      expect(fs.existsSync(path.join(base, "prisma", "schema.prisma")), `${app.path}/prisma/schema.prisma`).toBe(true);

      const envExample = readText(path.join(app.path, ".env.example"));
      const schema = readText(path.join(app.path, "prisma", "schema.prisma"));
      const expectedDatabaseProvider =
        app.key === "vase-app" ? 'provider = "mysql"' : 'provider = "postgresql"';
      const expectedDatabaseProtocol =
        app.key === "vase-app" ? "DATABASE_URL=mysql://" : "DATABASE_URL=postgresql://";

      expect(envExample).toContain(expectedDatabaseProtocol);
      expect(schema).toContain(expectedDatabaseProvider);
    }
  });

  it("creates the shared packages required by separated apps", () => {
    expect(v3WorkspacePackages.map((pkg) => pkg.name)).toEqual([
      "@vase/contracts",
      "@vase/config",
      "@vase/auth",
      "@vase/ui",
      "@vase/internal-api",
    ]);

    for (const pkg of v3WorkspacePackages) {
      const base = path.join(rootDir, pkg.path);
      expect(fs.existsSync(path.join(base, "package.json")), `${pkg.path}/package.json`).toBe(true);
      expect(fs.existsSync(path.join(base, "src", "index.ts")), `${pkg.path}/src/index.ts`).toBe(true);
    }
  });

  it("does not keep temporary V3 bootstrap code in the monolith", () => {
    expect(fs.existsSync(path.join(rootDir, "src"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "prisma"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "legacy"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "docker"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "Dockerfile"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "docker-compose.yml"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "src", "v3"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "src", "app", "api", "internal", "admin"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "src", "config", "v3-workspace.ts"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "src", "tests", "v3-platform-contracts.test.ts"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "src", "tests", "integration", "internal-admin-routes.test.ts"))).toBe(false);
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(".");
const appDir = path.join(rootDir, "apps", "vase-app");

function read(relativePath: string) {
  return fs.readFileSync(path.join(appDir, relativePath), "utf8");
}

describe("Vase App V3 migration", () => {
  it("contains the authenticated application entrypoints", () => {
    expect(
      fs.existsSync(path.join(appDir, "src", "app", "(auth)", "signin", "page.tsx")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(appDir, "src", "app", "(platform)", "app", "business", "launch", "route.ts"),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(appDir, "src", "auth.ts"))).toBe(true);
  });

  it("keeps the stage-one Prisma datasource on MySQL", () => {
    expect(read("prisma/schema.prisma")).toContain('provider = "mysql"');
  });

  it("builds and starts the workspace on port 3002", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    const dockerfile = read("Dockerfile");

    expect(packageJson.scripts.dev).toContain("--port 3002");
    expect(packageJson.scripts.start).toContain("--port 3002");
    expect(dockerfile).toContain("COPY tsconfig.base.json");
    expect(dockerfile).toContain("EXPOSE 3002");
    expect(dockerfile).toContain("prisma-startup.sh");
  });
});

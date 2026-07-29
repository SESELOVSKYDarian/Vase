import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

describe("Vase Rest production deploy", () => {
  it("validates required runtime values and the dedicated PostgreSQL protocol", () => {
    const validator = source("apps/vase-rest/scripts/validate-runtime-env.js");

    for (const variable of [
      "DATABASE_URL",
      "AUTH_SECRET",
      "VASE_APP_INTERNAL_URL",
      "SERVICE_TO_SERVICE_TOKEN",
      "REST_CREDENTIAL_ENCRYPTION_KEY",
      "REDIS_URL",
      "NEXT_PUBLIC_APP_URL",
    ]) {
      expect(validator).toContain(`"${variable}"`);
    }
    expect(validator).toContain("postgresql://");
  });

  it("builds from the root lockfile and migrates before starting on port 3009", () => {
    const dockerfile = source("apps/vase-rest/Dockerfile");

    expect(dockerfile).toContain("COPY package.json package-lock.json");
    expect(dockerfile).toContain("npm ci --workspace @vase/rest");
    expect(dockerfile).toContain("npm run prisma:generate --workspace @vase/rest");
    expect(dockerfile).toContain("npm run build --workspace @vase/rest");
    expect(dockerfile).toContain("node apps/vase-rest/scripts/validate-runtime-env.js");
    expect(dockerfile).toContain("npx prisma migrate deploy");
    expect(dockerfile).toContain('PORT:-3009');
    expect(dockerfile).toContain("EXPOSE 3009");
  });

  it("documents the EasyPanel service, domain, port, and database", () => {
    const sharedEnv = source(".env.easypanel.example");
    const guide = source("docs/v3/easypanel.md");

    expect(sharedEnv).toContain("NEXT_PUBLIC_APP_URL=https://rest.vase.ar");
    expect(sharedEnv).toContain("postgres-rest");
    expect(guide).toContain("`vase-rest-app`");
    expect(guide).toContain("`rest.vase.ar`");
    expect(guide).toContain("`3009`");
    expect(guide).toContain("`postgres-rest`");
  });
});

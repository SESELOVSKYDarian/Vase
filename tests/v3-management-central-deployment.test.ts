import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Management central-session deployment contract", () => {
  it("documents the authoritative Vase App production variables without secrets", () => {
    const env = source("apps/vase-app/.env.example");

    expect(env).toContain("AUTH_COOKIE_DOMAIN=.vase.ar");
    expect(env).toContain("AUTH_SECRET=");
    expect(env).toContain("SERVICE_TO_SERVICE_TOKEN=");
    expect(env).toContain("MANAGEMENT_PUBLIC_URL=https://management.vase.ar");
    expect(env).toContain("same value in Vase App and Vase Management");
  });

  it("keeps Management on its own PostgreSQL database and central auth contract", () => {
    const env = source("apps/vase-management/.env.example");

    expect(env).toContain(
      "DATABASE_URL=postgresql://vase_management_user:PASSWORD@postgres-management:5432/vase_management",
    );
    expect(env).toContain("AUTH_SECRET=");
    expect(env).toContain("APP_INTERNAL_URL=http://vase-app:3002");
    expect(env).toContain("VASE_APP_PUBLIC_URL=https://app.vase.ar");
    expect(env).toContain("NEXT_PUBLIC_VASE_APP_URL=https://app.vase.ar");
    expect(env).toContain("NEXT_PUBLIC_APP_URL=https://management.vase.ar");
    expect(env).toContain("SERVICE_TO_SERVICE_TOKEN=");
    expect(env).not.toContain("NEXTAUTH_SECRET");
    expect(env).not.toContain("MANAGEMENT_SSO_SECRET");
    expect(env).not.toContain("VASE_APP_INTERNAL_URL");
    expect(env).not.toContain("Vase Business");
  });

  it("only bakes public Vase App URLs into the Management image", () => {
    const dockerfile = source("apps/vase-management/Dockerfile");

    expect(dockerfile).toContain(
      "ARG VASE_APP_PUBLIC_URL=https://app.vase.ar",
    );
    expect(dockerfile).toContain(
      "ARG NEXT_PUBLIC_VASE_APP_URL=https://app.vase.ar",
    );
    expect(dockerfile).toContain(
      "ENV VASE_APP_PUBLIC_URL=$VASE_APP_PUBLIC_URL",
    );
    expect(dockerfile).toContain(
      "ENV NEXT_PUBLIC_VASE_APP_URL=$NEXT_PUBLIC_VASE_APP_URL",
    );
    expect(dockerfile).not.toMatch(/^ARG (?:AUTH_SECRET|SERVICE_TO_SERVICE_TOKEN)=/m);
  });

  it("explains central login, local projection and safe secret generation", () => {
    const readme = source("apps/vase-management/README.md");

    expect(readme).toContain("Vase App");
    expect(readme).toContain("cookie compartida");
    expect(readme).toContain("proyecci\u00f3n local");
    expect(readme).toContain("base PostgreSQL propia");
    expect(readme).toContain(
      "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
    expect(readme).not.toContain("admin@demo.com");
    expect(readme).not.toContain("vendedor@demo.com");
    expect(readme).not.toContain("Credenciales de demo");
    expect(readme).not.toContain("NEXTAUTH_SECRET");
    expect(readme.replace(/\s+/g, " ")).not.toContain(
      "--workspace @vase/management",
    );
  });
});

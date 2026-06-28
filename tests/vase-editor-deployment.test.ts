import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(".");
const editorDir = path.join(rootDir, "apps", "vase-editor");

function readRequiredFile(relativePath: string) {
  const absolutePath = path.join(editorDir, relativePath);
  expect(fs.existsSync(absolutePath), `apps/vase-editor/${relativePath}`).toBe(true);
  return fs.readFileSync(absolutePath, "utf8");
}

describe("Vase Editor deployment", () => {
  it("contains the independently deployable editor sources", () => {
    for (const relativePath of [
      "Dockerfile",
      "README.md",
      ".env.example",
      "db/schema.sql",
      "server/package.json",
      "server/package-lock.json",
      "server/src/index.js",
      "web/package.json",
      "web/package-lock.json",
      "web/src",
    ]) {
      expect(
        fs.existsSync(path.join(editorDir, relativePath)),
        `apps/vase-editor/${relativePath}`,
      ).toBe(true);
    }
  });

  it("builds from the EasyPanel app directory and exposes the editor port", () => {
    const dockerfile = readRequiredFile("Dockerfile");

    expect(dockerfile).toContain("COPY web/package*.json ./");
    expect(dockerfile).toContain("COPY server/package*.json ./");
    expect(dockerfile).toContain("COPY db/ /app/db/");
    expect(dockerfile).toContain("EXPOSE 3000");
    expect(dockerfile).toContain('CMD ["node", "src/index.js"]');
  });

  it("keeps the health endpoint required by EasyPanel", () => {
    const serverApp = readRequiredFile("server/src/app.js");

    expect(serverApp).toContain("app.get('/health'");
  });

  it("publishes the editor as business.vase.ar", () => {
    const deploymentFiles = [
      "apps/vase-editor/.env.example",
      "apps/vase-editor/Dockerfile",
      "apps/vase-editor/README.md",
      "apps/vase-editor/server/.env.example",
      "apps/vase-editor/web/.env.example",
      "apps/vase-editor/web/src/components/admin/evolution/IntegrationsEditor.jsx",
      "docs/deployment/business-editor-bridge.md",
      "docs/v3/easypanel.md",
    ].map((relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8"));

    expect(deploymentFiles.join("\n")).toContain("business.vase.ar");
    expect(deploymentFiles.join("\n")).not.toContain("editor.vase.ar");
  });

  it("commits placeholders instead of runtime secrets", () => {
    const envExample = readRequiredFile(".env.example");

    expect(fs.existsSync(path.join(editorDir, ".env"))).toBe(false);
    expect(fs.existsSync(path.join(editorDir, "server", ".env"))).toBe(false);
    expect(fs.existsSync(path.join(editorDir, "web", ".env"))).toBe(false);
    expect(envExample).toMatch(/DATABASE_URL=postgres:\/\/postgres:CHANGE_ME_PASSWORD@/);
    expect(envExample).toContain("VASE_BUSINESS_SSO_SECRET=CHANGE_ME_SSO_SECRET");
    expect(envExample).toContain("UPLOADS_JWT_SECRET=CHANGE_ME_UPLOADS_JWT_SECRET");
    expect(envExample).toContain("SMTP_PASS=CHANGE_ME_SMTP_PASSWORD");
    expect(envExample).toContain("CLOUDFLARE_API_TOKEN=CHANGE_ME_CLOUDFLARE_TOKEN");
    expect(envExample).toContain("VASE_WEBHOOK_SECRET=CHANGE_ME_WEBHOOK_SECRET");
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

describe("Vase Admin and App production build contexts", () => {
  it("copies the shared TypeScript configuration into the Admin image", () => {
    const dockerfile = read("apps/vase-admin/Dockerfile");

    expect(dockerfile).toContain("COPY tsconfig.base.json ./");
    expect(dockerfile.indexOf("COPY tsconfig.base.json ./")).toBeLessThan(
      dockerfile.indexOf("npm run build --workspace @vase/admin"),
    );
  });

  it("uses the public next-auth type surface instead of an undeclared Auth.js package", () => {
    const cookiesSource = read("apps/vase-app/src/lib/auth/cookies.ts");

    expect(cookiesSource).not.toContain('@auth/core/types');
    expect(cookiesSource).toContain('import type { NextAuthConfig } from "next-auth"');
  });
});

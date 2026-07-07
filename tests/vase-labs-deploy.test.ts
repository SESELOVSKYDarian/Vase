import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const labsDir = path.resolve("apps/vase-labs");

describe("Vase Labs deployment", () => {
  it("packages Labs from the monorepo root for EasyPanel", () => {
    const dockerfile = fs.readFileSync(
      path.join(labsDir, "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("COPY tsconfig.base.json");
    expect(dockerfile).toContain("npm run prisma:generate --workspace @vase/labs");
    expect(dockerfile).toContain("npm run build --workspace @vase/labs");
    expect(dockerfile).toContain("ARG PORT=3000");
    expect(dockerfile).toContain("ENV PORT=$PORT");
    expect(dockerfile).toContain("EXPOSE 3000");
    expect(dockerfile).toContain("${PORT:-3000}");
  });
});

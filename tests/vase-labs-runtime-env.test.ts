import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vase Labs runtime environment", () => {
  it("validates that Labs uses its MySQL DATABASE_URL at startup", () => {
    const dockerfile = fs.readFileSync(
      path.resolve("apps/vase-labs/Dockerfile"),
      "utf8",
    );
    const validator = fs.readFileSync(
      path.resolve("apps/vase-labs/scripts/validate-runtime-env.js"),
      "utf8",
    );

    expect(dockerfile).toContain("node apps/vase-labs/scripts/validate-runtime-env.js");
    expect(validator).toContain("mysql://");
    expect(validator).toContain("Do not use a postgresql:// DATABASE_URL for Labs");
    expect(validator).toContain("KNOWLEDGE_S3_ENDPOINT");
    expect(validator).toContain("KNOWLEDGE_S3_SECRET_ACCESS_KEY");
    expect(validator).toContain("APP_INTERNAL_URL");
    expect(validator).toContain("SERVICE_TO_SERVICE_TOKEN");
    expect(validator).toContain("AUTH_SECRET");
    expect(validator).toContain("TOKEN_ENCRYPTION_SECRET");
  });
});

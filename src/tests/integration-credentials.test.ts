import { describe, expect, it } from "vitest";
import {
  generateApiCredential,
  parseApiCredential,
  verifySecretHash,
} from "@/lib/integrations/credentials";

describe("integration credentials", () => {
  it("generates verifiable api credentials", () => {
    const generated = generateApiCredential(["catalog:read"]);

    expect(generated.displayToken.startsWith("vsk_live_")).toBe(true);
    expect(verifySecretHash(generated.displayToken, generated.tokenHash)).toBe(true);
  });

  it("parses bearer or direct api key values", () => {
    const generated = generateApiCredential(["catalog:read"]);

    expect(parseApiCredential(generated.displayToken)?.keyId).toBe(generated.keyId);
    expect(parseApiCredential(`Bearer ${generated.displayToken}`)?.keyId).toBe(generated.keyId);
  });
});

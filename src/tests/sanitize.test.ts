import { describe, expect, it } from "vitest";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";

describe("sanitize helpers", () => {
  it("removes html payloads", () => {
    expect(sanitizeText("<script>alert(1)</script>Vase")).toBe("Vase");
  });

  it("returns null for empty sanitized strings", () => {
    expect(sanitizeNullableText("<img src=x />")).toBe(null);
  });
});

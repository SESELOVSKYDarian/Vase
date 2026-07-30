import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("App contact form contract", () => {
  it("submits company and phone through the local marketing form", () => {
    const action = fs.readFileSync(
      path.resolve("src/app/(auth)/contact-actions.ts"),
      "utf8",
    );
    const modal = fs.readFileSync(
      path.resolve("src/components/marketing/footer-contact-modal.tsx"),
      "utf8",
    );

    expect(action).toContain('formData.get("company")');
    expect(action).toContain('formData.get("phone")');
    expect(modal).toContain('name="company"');
    expect(modal).toContain('name="phone"');
  });
});

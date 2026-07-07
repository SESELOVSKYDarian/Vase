import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const wizard = readFileSync(
  "apps/vase-labs/app/app/channels/channels-client.tsx",
  "utf8",
);
const page = readFileSync(
  "apps/vase-labs/app/app/channels/page.tsx",
  "utf8",
);
const styles = readFileSync("apps/vase-labs/app/globals.css", "utf8");

describe("Vase Labs official channels UI", () => {
  it("offers exactly WhatsApp, Instagram and Facebook", () => {
    expect(wizard).toContain('id: "WHATSAPP"');
    expect(wizard).toContain('id: "INSTAGRAM"');
    expect(wizard).toContain('id: "FACEBOOK"');
    expect(wizard).not.toContain("WEBCHAT");
    expect(wizard).not.toContain("BAILEYS");
    expect(wizard).not.toContain("Access Token");
    expect(wizard).not.toContain("App Secret");
  });

  it("implements the five-step guided connection flow", () => {
    for (const label of ["Canal", "Preparación", "Cuenta", "Verificación", "Listo"]) {
      expect(wizard).toContain(label);
    }
    expect(wizard).toContain('aria-live="polite"');
    expect(wizard).toContain("<dialog");
  });

  it("protects the page with shared Labs request context and responsive focus styles", () => {
    expect(page).toContain("resolveLabsRequestContext");
    expect(styles).toContain(".channels-dialog");
    expect(styles).toContain("@media (max-width: 720px)");
    expect(styles).toContain("focus-visible");
  });
});

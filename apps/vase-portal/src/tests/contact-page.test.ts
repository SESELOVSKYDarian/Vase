import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Portal contact page", () => {
  it("publishes a functional email and WhatsApp contact workspace", () => {
    const pagePath = path.resolve("src/app/(marketing)/contact/page.tsx");
    const formPath = path.resolve("src/components/marketing/contact-form.tsx");
    const footerFormPath = path.resolve("src/components/marketing/footer-contact-modal.tsx");

    expect(fs.existsSync(pagePath)).toBe(true);
    expect(fs.existsSync(formPath)).toBe(true);
    expect(fs.existsSync(footerFormPath)).toBe(true);
    if (!fs.existsSync(pagePath) || !fs.existsSync(formPath) || !fs.existsSync(footerFormPath)) return;

    const page = fs.readFileSync(pagePath, "utf8");
    const form = fs.readFileSync(formPath, "utf8");
    const footerForm = fs.readFileSync(footerFormPath, "utf8");

    expect(page).toContain('title: "Contacto"');
    expect(page).toContain("<ContactForm");
    expect(page).toContain("https://wa.me/5492234496403");
    expect(form).toContain("useActionState");
    expect(form).toContain('name="company"');
    expect(form).toContain('name="phone"');
    expect(form).toContain('aria-live="polite"');
    expect(footerForm).toContain('name="company"');
    expect(footerForm).toContain('name="phone"');
  });
});

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Rest product experience shell", () => {
  it("shows active branch, explicit connectivity status and accessible focus", async () => {
    const [shell, css, login] = await Promise.all([
      readFile(new URL("../apps/vase-rest/app/(product)/rest-shell.tsx", import.meta.url), "utf8"),
      readFile(new URL("../apps/vase-rest/app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../apps/vase-rest/app/(product)/staff/login/page.tsx", import.meta.url), "utf8"),
    ]);
    expect(shell).toContain("Sucursal activa");
    expect(shell).toContain("Sin conexión");
    expect(shell).toContain("Datos pendientes");
    expect(css).toContain(":focus-visible");
    expect(css).not.toMatch(/#(?:7c3aed|8b5cf6|a855f7)/i);
    expect(login).toContain("Código de empleado");
    expect(login).toContain("PIN individual");
  });
});

import { describe, expect, it } from "vitest";
import { applyDocumentCorrection, resolveEffectiveDocumentContent } from "../apps/vase-labs/app/lib/knowledge-document-version";

describe("knowledge document versions", () => {
  it("resolves the newest active full snapshot", () => {
    expect(resolveEffectiveDocumentContent("original", [{ content: "version 2", active: true }, { content: "old", active: false }])).toBe("version 2");
    expect(resolveEffectiveDocumentContent("original", [])).toBe("original");
  });

  it("replaces an exact fragment while preserving the rest of the document", () => {
    const current = "Sucursales\nTeflón Central abre sábados de 09:00 a 13:00.\nEnvíos disponibles.";
    const next = applyDocumentCorrection(current, { content: "Actualizar horario", beforeText: "sábados de 09:00 a 13:00", afterText: "sábados de 08:00 a 14:00" });
    expect(next).toContain("Sucursales");
    expect(next).toContain("sábados de 08:00 a 14:00");
    expect(next).toContain("Envíos disponibles");
    expect(next).not.toContain("sábados de 09:00 a 13:00");
  });

  it("preserves the source and appends an authoritative correction when exact replacement is unavailable", () => {
    const next = applyDocumentCorrection("Documento original completo", { content: "Los sábados se atiende de 08:00 a 14:00." });
    expect(next).toContain("Documento original completo");
    expect(next).toContain("CORRECCIÓN VIGENTE");
    expect(next).toContain("08:00 a 14:00");
  });
});

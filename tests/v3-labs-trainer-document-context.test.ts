import { describe, expect, it } from "vitest";
import { selectTrainerKnowledgeContext } from "../apps/vase-labs/app/lib/trainer-document-context";

describe("trainer document context", () => {
  const instruction = "Cambiar el horario del sábado en Teflón Central de Mar del Plata a 08:00–14:00";

  it("finds a relevant fragment deep inside an uploaded document", () => {
    const filler = "Información general. ".repeat(100);
    const result = selectTrainerKnowledgeContext(instruction, [{
      id: "file_1", title: "Sucursales.txt", sourceType: "FILE",
      content: `${filler}Teflón Central de Mar del Plata atiende los sábados de 09:00 a 13:00.${filler}`,
    }], []);
    expect(result.ambiguous).toBe(false);
    expect(result.items[0]).toMatchObject({ id: "file_1", sourceType: "FILE" });
    expect(result.items[0].content).toContain("Teflón Central de Mar del Plata");
    expect(result.items[0].content.length).toBeLessThanOrEqual(3200);
  });

  it("uses the active document version and flags similarly relevant files", () => {
    const items = [
      { id: "a", title: "Locales A", sourceType: "FILE", content: "Teflón Central de Mar del Plata abre los sábados." },
      { id: "b", title: "Locales B", sourceType: "FILE", content: "Teflón Central de Mar del Plata abre los sábados." },
    ];
    const result = selectTrainerKnowledgeContext(instruction, items, [{ knowledgeItemId: "a", content: "Teflón Central de Mar del Plata atiende sábados de 10 a 12." }]);
    expect(result.items[0].content).toContain("10 a 12");
    expect(result.ambiguous).toBe(true);
  });
});

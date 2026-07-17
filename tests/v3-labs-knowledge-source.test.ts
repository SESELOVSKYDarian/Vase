import { describe, expect, it } from "vitest";
import {
  groupKnowledgeItems,
  parseKnowledgeInput,
} from "../apps/vase-labs/app/lib/knowledge-source";

describe("Labs knowledge source rules", () => {
  it.each([
    "manual.pdf",
    "manual.doc",
    "manual.docx",
    "stock.xls",
    "stock.xlsx",
    "deck.ppt",
    "deck.pptx",
    "notes.txt",
    "MANUAL.PDF",
  ])("accepts %s", (fileName) => {
    expect(parseKnowledgeInput({ type: "FILE", title: fileName, fileName })).toEqual({
      type: "FILE",
      title: fileName,
      fileName,
    });
  });

  it.each(["image.png", "archive.zip", "data.csv", "script.js"])("rejects %s", (fileName) => {
    expect(() => parseKnowledgeInput({ type: "FILE", title: fileName, fileName })).toThrow(
      "KNOWLEDGE_FILE_TYPE_UNSUPPORTED",
    );
  });

  it("validates URL payloads", () => {
    expect(parseKnowledgeInput({ type: "URL", title: "Ayuda", url: "https://vase.ar/ayuda" })).toEqual({
      type: "URL",
      title: "Ayuda",
      url: "https://vase.ar/ayuda",
    });
    expect(() => parseKnowledgeInput({ type: "URL", title: "Rota", url: "texto" })).toThrow(
      "KNOWLEDGE_URL_INVALID",
    );
  });

  it("requires nonempty FAQ questions and answers", () => {
    expect(
      parseKnowledgeInput({
        type: "FAQ",
        title: "Envios",
        question: "¿Cuando llega?",
        answer: "En 48 horas.",
      }),
    ).toEqual({
      type: "FAQ",
      title: "Envios",
      question: "¿Cuando llega?",
      answer: "En 48 horas.",
    });
    expect(() => parseKnowledgeInput({ type: "FAQ", title: "Envios", question: " ", answer: "Respuesta" })).toThrow(
      "KNOWLEDGE_FAQ_INVALID",
    );
    expect(() => parseKnowledgeInput({ type: "FAQ", title: "Envios", question: "Pregunta", answer: " " })).toThrow(
      "KNOWLEDGE_FAQ_INVALID",
    );
  });

  it("requires a nonempty title and canonical type", () => {
    expect(() => parseKnowledgeInput({ type: "FILE", title: " ", fileName: "manual.pdf" })).toThrow(
      "KNOWLEDGE_INPUT_INVALID",
    );
    expect(() => parseKnowledgeInput({ type: "OTHER", title: "Fuente" })).toThrow("KNOWLEDGE_INPUT_INVALID");
  });

  it.each(["VASE_MANAGEMENT", "EXTERNAL_MANAGEMENT"] as const)("returns the %s type and title", (type) => {
    expect(parseKnowledgeInput({ type, title: " Catálogo " })).toEqual({ type, title: "Catálogo" });
  });

  it("returns only populated groups in canonical order and preserves item order", () => {
    const faqItems = [
      { id: "2", sourceType: "FAQ", title: "Envios", status: "READY", updatedAt: new Date(2) },
      { id: "3", sourceType: "FAQ", title: "Cambios", status: "READY", updatedAt: new Date(3) },
    ];
    const fileItem = { id: "1", sourceType: "FILE", title: "Manual", status: "READY", updatedAt: new Date(1) };

    const groups = groupKnowledgeItems([...faqItems, fileItem]);

    expect(groups.map((group) => group.type)).toEqual(["FILE", "FAQ"]);
    expect(groups[0]?.items).toEqual([fileItem]);
    expect(groups[1]?.items).toEqual(faqItems);
  });
});

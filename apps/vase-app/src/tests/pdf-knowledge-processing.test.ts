import { AiKnowledgeItemType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildPdfKnowledgeSnippet,
  normalizeExtractedPdfText,
} from "@/server/services/ai/pdf-text";
import { buildProcessedKnowledgeSnippet } from "@/server/services/ai/knowledge-processing";

describe("PDF knowledge extraction", () => {
  it("normalizes PDF text before storing it as knowledge", () => {
    const text = normalizeExtractedPdfText("  Vase Labs\r\n\r\n\r\n  Planes   y   precios  \n\n  Starter  ");

    expect(text).toBe("Vase Labs\n\nPlanes y precios\n\nStarter");
  });

  it("stores extracted PDF text in a bounded knowledge snippet", () => {
    const snippet = buildPdfKnowledgeSnippet({
      fileName: "vase-planes.pdf",
      text: "Plan Starter: $120.000 por mes.",
    });

    expect(snippet).toContain("Contenido extraido del PDF vase-planes.pdf");
    expect(snippet).toContain("Plan Starter: $120.000 por mes.");
  });

  it("keeps extracted PDF text when queued knowledge is processed", () => {
    const snippet = buildProcessedKnowledgeSnippet({
      id: "knowledge-1",
      type: AiKnowledgeItemType.FILE,
      title: "vase-planes.pdf",
      fileName: "vase-planes.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 1234,
      sourceUrl: null,
      contentSnippet:
        "Contenido extraido del PDF vase-planes.pdf:\n\nPlan Starter: $120.000 por mes.",
    });

    expect(snippet).toContain("Plan Starter: $120.000 por mes.");
    expect(snippet).not.toContain("Contenido agregado como referencia documental");
  });
});

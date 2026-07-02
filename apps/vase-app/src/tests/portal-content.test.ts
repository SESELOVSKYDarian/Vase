import { describe, expect, it } from "vitest";
import {
  toPublicDocumentDetail,
  toPublicDocumentSummary,
} from "@/server/services/portal-content";

describe("Portal content serialization", () => {
  it("returns only public document summary fields", () => {
    expect(
      toPublicDocumentSummary({
        id: "doc-1",
        slug: "inicio",
        title: "Inicio",
        summary: null,
        updatedAt: new Date("2026-06-30T12:00:00.000Z"),
        sections: [{ title: "Primera sección" }],
      }),
    ).toEqual({
      id: "doc-1",
      slug: "inicio",
      title: "Inicio",
      summary: "Primera sección",
      updatedAt: "2026-06-30T12:00:00.000Z",
    });
  });

  it("omits discussions and internal revision data from details", () => {
    const result = toPublicDocumentDetail({
      slug: "api",
      title: "API",
      summary: "Referencia",
      sections: [
        {
          id: "section-1",
          title: "Autenticación",
          body: "Usa una API key.",
          steps: [
            {
              id: "step-1",
              title: "Crear key",
              content: "Abrir el panel.",
            },
          ],
        },
      ],
    });

    expect(result.sections[0]).toEqual({
      id: "section-1",
      title: "Autenticación",
      body: "Usa una API key.",
      steps: [
        {
          id: "step-1",
          title: "Crear key",
          content: "Abrir el panel.",
        },
      ],
    });
  });
});

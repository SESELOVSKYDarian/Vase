import { describe, expect, it, vi } from "vitest";
import { createTrainerInstructionInterpreter } from "../apps/vase-labs/app/lib/trainer-instruction-interpreter";

describe("Labs trainer instruction interpreter", () => {
  it("turns a natural spoken instruction into a reviewable FAQ proposal", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.input).toContain("Quiero que agregues a tus conocimientos");
      expect(body.text.format.type).toBe("json_schema");
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          changeType: "FAQ_CREATE",
          targetKnowledgeId: null,
          question: "¿Hacen envíos?",
          answer: "Sí, hacemos envíos a todo el país.",
          content: null,
        }),
      }), { status: 200 });
    });

    const proposal = await createTrainerInstructionInterpreter({ apiKey: "sk-test", fetcher: fetcher as typeof fetch }).interpret({
      instruction: "Quiero que agregues a tus conocimientos que hacemos envíos a todo el país",
      baseRevision: 7,
      knowledge: [],
    });

    expect(proposal).toEqual({
      changeType: "FAQ_CREATE",
      baseRevision: 7,
      proposedValue: { question: "¿Hacen envíos?", answer: "Sí, hacemos envíos a todo el país." },
    });
  });

  it("keeps genuinely ambiguous instructions blocked", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      output_text: JSON.stringify({ changeType: "AMBIGUOUS", targetKnowledgeId: null, question: null, answer: null, content: null }),
    }), { status: 200 }));
    const interpreter = createTrainerInstructionInterpreter({ apiKey: "sk-test", fetcher: fetcher as typeof fetch });
    await expect(interpreter.interpret({ instruction: "cambiá eso", baseRevision: 1, knowledge: [] }))
      .rejects.toThrow("TRAINER_INSTRUCTION_AMBIGUOUS");
  });

  it("treats a complete schedule change as new knowledge when no exact source exists", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.instructions).toContain("cambio contiene el dato completo");
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          changeType: "FAQ_CREATE", targetKnowledgeId: null,
          question: "¿Cuál es el horario de atención los sábados?",
          answer: "Los sábados atendemos de 8:00 a 14:00.", content: null,
        }),
      }), { status: 200 });
    });
    const result = await createTrainerInstructionInterpreter({ apiKey: "sk-test", fetcher: fetcher as typeof fetch }).interpret({
      instruction: "Quiero que cambies el horario de atención de los sábados, que pase a ser de 8 de la mañana hasta las 14 horas.",
      baseRevision: 2,
      knowledge: [],
    });
    expect(result.changeType).toBe("FAQ_CREATE");
  });

  it("links a complete branch schedule to its existing document when the model returns ambiguous", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      output_text: JSON.stringify({ changeType: "AMBIGUOUS", targetKnowledgeId: null, question: null, answer: null, content: null }),
    }), { status: 200 }));
    const result = await createTrainerInstructionInterpreter({ apiKey: "sk-test", fetcher: fetcher as typeof fetch }).interpret({
      instruction: "Quiero hacer este cambio del sábado del horario que hay para que pase a ser a las 8 de la mañana el inicio del horario de atención hasta las 14 horas en Teflón Central de Mar del Plata.",
      baseRevision: 4,
      knowledge: [{ id: "file_teflon", title: "Sucursales", sourceType: "FILE", content: "Teflón Central de Mar del Plata atiende sábados de 09:00 a 13:00." }],
    });
    expect(result).toMatchObject({
      changeType: "DOCUMENT_CORRECTION",
      baseRevision: 4,
      targetKnowledgeId: "file_teflon",
      proposedValue: { content: "Quiero hacer este cambio del sábado del horario que hay para que pase a ser a las 8 de la mañana el inicio del horario de atención hasta las 14 horas en Teflón Central de Mar del Plata." },
    });
  });

  it("parses spoken Spanish numbers when linking a schedule to a document", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      output_text: JSON.stringify({ changeType: "AMBIGUOUS", targetKnowledgeId: null, question: null, answer: null, content: null }),
    }), { status: 200 }));
    const result = await createTrainerInstructionInterpreter({ apiKey: "sk-test", fetcher: fetcher as typeof fetch }).interpret({
      instruction: "Quiero cambiar el horario de atención de los sábados, pasarlo que sea de ocho de la mañana a quince horas.",
      baseRevision: 5,
      knowledge: [{ id: "file_teflon", title: "Sucursales", sourceType: "FILE", content: "Horarios: sábado de 8 a 13." }],
    });
    expect(result).toMatchObject({ changeType: "DOCUMENT_CORRECTION", targetKnowledgeId: "file_teflon" });
  });
});

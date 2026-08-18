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
});

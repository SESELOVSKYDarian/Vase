import { describe, expect, it } from "vitest";
import { generateAssistantReply } from "@/server/services/ai/completions";

describe("AI completions", () => {
  it("uses file knowledge blocks instead of falling back to no knowledge", async () => {
    const reply = await generateAssistantReply({
      config: { tone: "PREMIUM" },
      userMessage: "hola",
      knowledgeText: [
        "Archivo: vase-labs-servicios.md",
        "Vase Labs desarrolla ecommerce personalizado, automatizaciones comerciales y agentes de IA para WhatsApp.",
      ].join("\n"),
    });

    expect(reply).toContain("Vase Labs desarrolla ecommerce personalizado");
    expect(reply).not.toContain("Todavia no hay conocimiento suficiente");
  });
});

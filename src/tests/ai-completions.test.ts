import { describe, expect, it } from "vitest";
import { generateAssistantReply } from "@/server/services/ai/completions";

describe("AI completions", () => {
  it("answers greetings with a concise Vase Labs welcome", async () => {
    const reply = await generateAssistantReply({
      config: { tone: "PREMIUM", displayName: "Vase Labs" },
      userMessage: "hola",
      knowledgeText: [
        "Archivo: documentacion-funcional-sistema.pdf",
        "Archivo cargado: documentacion-funcional-sistema.pdf. Contenido agregado como referencia documental para el asistente. Tipo: application/pdf. Tamano: 203467 bytes.",
      ].join("\n"),
    });

    expect(reply).toContain("Hola, soy el asistente de Vase Labs");
    expect(reply).toContain("ecommerce personalizado");
    expect(reply).toContain("automatizaciones");
    expect(reply).toContain("agentes de IA");
    expect(reply).not.toContain("documentacion-funcional-sistema.pdf");
    expect(reply).not.toContain("Tamano:");
  });

  it("ignores file metadata blocks as usable knowledge", async () => {
    const reply = await generateAssistantReply({
      config: { tone: "PREMIUM" },
      userMessage: "que ofrecen?",
      knowledgeText: [
        "Archivo: documentacion-funcional-sistema.pdf",
        "Archivo cargado: documentacion-funcional-sistema.pdf. Contenido agregado como referencia documental para el asistente. Tipo: application/pdf. Tamano: 203467 bytes.",
      ].join("\n"),
    });

    expect(reply).toContain("Todavia no hay conocimiento suficiente");
    expect(reply).not.toContain("documentacion-funcional-sistema.pdf");
    expect(reply).not.toContain("Tamano:");
  });

  it("uses file knowledge blocks instead of falling back to no knowledge", async () => {
    const reply = await generateAssistantReply({
      config: { tone: "PREMIUM" },
      userMessage: "que ofrecen?",
      knowledgeText: [
        "Archivo: vase-labs-servicios.md",
        "Vase Labs desarrolla ecommerce personalizado, automatizaciones comerciales y agentes de IA para WhatsApp.",
      ].join("\n"),
    });

    expect(reply).toContain("Vase Labs desarrolla ecommerce personalizado");
    expect(reply).not.toContain("Todavia no hay conocimiento suficiente");
  });
});

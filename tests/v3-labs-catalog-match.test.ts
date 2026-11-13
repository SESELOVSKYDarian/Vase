import { describe, expect, it, vi } from "vitest";
import { matchScore, queryTerms, rankProducts } from "../apps/vase-labs/app/lib/catalog-match";
import { createAiOrchestrator } from "../apps/vase-labs/app/lib/ai-orchestrator";

const products = [
  { name: "Tapa para gabinete de gas 40x40", sku: "TGG-40" },
  { name: "Gabinete para medidor de gas", sku: "GMG-01" },
  { name: "Llave de paso 3/4", sku: "LLP-34" },
  { name: "Cinta teflón", sku: "CT-12" },
];

describe("Labs: buscar productos aunque no escriban el nombre exacto", () => {
  it("se queda con las palabras que importan, sin acentos ni plurales", () => {
    expect(queryTerms("Hola! ¿Tienen tapas de gabinete de gas?")).toEqual(["tapa", "gabinete", "gas"]);
  });

  it("encuentra la tapa del gabinete de gas primero", () => {
    const ranked = rankProducts(products, "tapa del gabinete de gas", (product) => `${product.name} ${product.sku}`);
    expect(ranked[0]?.name).toBe("Tapa para gabinete de gas 40x40");
    expect(ranked.map((product) => product.name)).toContain("Gabinete para medidor de gas");
    expect(ranked.map((product) => product.name)).not.toContain("Cinta teflón");
  });

  it("tolera palabras parecidas y medidas", () => {
    expect(matchScore(queryTerms("teflon"), "Cinta teflón")).toBeGreaterThan(0);
    expect(matchScore(queryTerms("gabinetes"), "Gabinete para medidor")).toBeGreaterThan(0);
    expect(rankProducts(products, "algo para pintar paredes", (product) => product.name)).toEqual([]);
  });
});

describe("Labs: el asistente pasa la charla a una persona cuando no encuentra lo que piden", () => {
  it("pide una persona y avisa con la razón", async () => {
    const requestHandoff = vi.fn().mockResolvedValue(undefined);
    const buildAiResources = vi.fn().mockResolvedValue({ context: "Catálogo", allowedImageUrls: [] });
    const orchestrator = createAiOrchestrator({
      knowledge: { buildContext: async () => "" },
      catalog: { buildAiResources },
      generateReply: async () => ({
        text: "No lo encuentro en el catálogo. Ya le avisé al equipo y te atienden enseguida.",
        imageUrls: [],
        orderAction: { type: "NONE" },
        handoff: { needed: true, reason: "Pide tapa de gabinete de gas y no está en el catálogo" },
        inputTokens: 1,
        outputTokens: 1,
      }),
      persistAssistantReply: async () => ({ messageId: "m1" }),
      registerTokenUsage: async () => ({ totalTokens: 2 }),
      sendReply: async () => ({ ok: true, providerMessageId: "p1" }),
      requestHandoff,
    } as never);

    const result = await orchestrator.processConversation({
      assistantId: "a1",
      conversationId: "c1",
      globalTenantId: "t1",
      channel: "WHATSAPP",
      latestUserText: "¿Tienen tapa del gabinete de gas?",
      canRunAi: true,
      handoffActive: false,
    });

    expect(buildAiResources).toHaveBeenCalledWith("t1", "¿Tienen tapa del gabinete de gas?");
    expect(requestHandoff).toHaveBeenCalledWith({ conversationId: "c1", reason: "Pide tapa de gabinete de gas y no está en el catálogo" });
    expect(result).toMatchObject({ ok: true, handoff: true });
  });
});

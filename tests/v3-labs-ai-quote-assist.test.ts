import { describe, expect, it, vi } from "vitest";
import { parseOrderAction } from "../apps/vase-labs/app/lib/openai-reply-generator/parse-order-action";
import { buildQuoteLines, quoteChatText, quotePublicUrl, quoteUnavailableText, readQuoteMessageMeta, signQuoteToken, verifyQuoteToken } from "../apps/vase-labs/app/lib/conversation-quote";
import { renderQuotePdf } from "../apps/vase-labs/app/lib/quote-pdf";
import { parseInboxAssist, buildAssistInstructions } from "../apps/vase-labs/app/lib/inbox-assist";
import { createAiOrchestrator } from "../apps/vase-labs/app/lib/ai-orchestrator";

const env = { TOKEN_ENCRYPTION_SECRET: "s".repeat(32), NEXT_PUBLIC_APP_URL: "https://labs.vase.ar" } as NodeJS.ProcessEnv;

describe("Presupuesto en PDF por chat", () => {
  it("acepta orderAction QUOTE sin datos de entrega", () => {
    expect(parseOrderAction({
      type: "QUOTE",
      items: [{ productId: "fv-0181", quantity: 3 }],
      customer: { name: "Martín", phone: "", email: "" },
      fulfillment: { type: "PICKUP", branchId: "", pickupLabel: "", address: "" },
      notes: "",
    })).toEqual({ type: "QUOTE", items: [{ productId: "fv-0181", quantity: 3 }], customerName: "Martín" });
  });

  it("sigue exigiendo datos completos para PREPARE", () => {
    expect(() => parseOrderAction({ type: "PREPARE", items: [{ productId: "a", quantity: 1 }], customer: { name: "", phone: "" }, fulfillment: { type: "PICKUP" } })).toThrow("OPENAI_RESPONSE_INVALID");
  });

  it("calcula con los precios del catálogo, junta repetidos y nunca muestra IDs internos", () => {
    const built = buildQuoteLines(
      [{ productId: "a", quantity: 2 }, { productId: "a", quantity: 1 }, { productId: "b", quantity: 1 }, { productId: "zz-secreto", quantity: 1 }],
      [
        { externalProductId: "a", sku: "FV", name: "FV Arizona", price: "100600.50" },
        { externalProductId: "b", sku: null, name: "Sin precio", price: null },
      ],
    );
    expect(built.lines).toEqual([{ productId: "a", sku: "FV", name: "FV Arizona", quantity: 3, unitPrice: 100600.5, total: 301801.5 }]);
    expect(built.total).toBe(301801.5);
    expect(built.missing.join(" ")).not.toContain("zz-secreto");
    expect(quoteUnavailableText(["un producto que no está en el catálogo"])).not.toContain("zz");
  });

  it("firma el link del PDF y rechaza firmas cambiadas", () => {
    const token = signQuoteToken("quote12345", env);
    expect(verifyQuoteToken(token, env)).toBe("quote12345");
    expect(verifyQuoteToken(`${token}x`, env)).toBeNull();
    expect(verifyQuoteToken(`quote12346.${token.split(".")[1]}`, env)).toBeNull();
    expect(verifyQuoteToken("../etc.passwd", env)).toBeNull();
    expect(quotePublicUrl({ id: "quote12345", number: 7 }, env)).toMatch(/^https:\/\/labs\.vase\.ar\/api\/public\/quotes\/quote12345\.[\w-]+\/presupuesto-7\.pdf$/);
  });

  it("en Instagram el link va en el texto porque no recibe archivos", () => {
    const text = quoteChatText({ number: 12, total: 1000, currency: "ARS", validUntil: new Date("2026-11-24T12:00:00Z"), missing: [], includesLink: true, url: "https://labs.vase.ar/x.pdf" });
    expect(text).toContain("N.º 0012");
    expect(text).toContain("https://labs.vase.ar/x.pdf");
  });

  it("arma un PDF válido con acentos y varias páginas", () => {
    const pdf = renderQuotePdf({
      businessName: "Sanitarios El Teflón",
      businessContact: ["WhatsApp 223 456 7788"],
      number: 3,
      createdAt: new Date(),
      validUntil: new Date(),
      customerName: "Martín (obra)",
      currency: "ARS",
      lines: Array.from({ length: 30 }, (_, index) => ({ name: `Grifería ${index}`, quantity: 1, unitPrice: 10, total: 10 })),
      subtotal: 300,
      total: 300,
    });
    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("Sanitarios El Tefl\xF3n");
    expect(text).toContain("Mart\xEDn \\(obra\\)");
    expect(text.match(/\/Type \/Page /g)?.length).toBeGreaterThan(1);
  });

  it("lee el presupuesto guardado en el mensaje", () => {
    expect(readQuoteMessageMeta({ imageUrls: [] })).toBeNull();
    expect(readQuoteMessageMeta({ quote: { id: "q", number: 1, url: "https://x", total: 5, lines: [{ name: "A", quantity: 1, total: 5 }, { bad: true }] } })?.lines).toHaveLength(1);
  });

  it("el orquestador manda el PDF y deriva si faltan precios", async () => {
    const sendReply = vi.fn().mockResolvedValue({ ok: true, providerMessageId: "wamid" });
    const persistAssistantReply = vi.fn().mockResolvedValue({ messageId: "m1" });
    const requestHandoff = vi.fn().mockResolvedValue(undefined);
    const quote = { id: "q1", number: 1, currency: "ARS", total: 10, validUntil: "", url: "https://labs.vase.ar/q.pdf", lines: [] };
    const orchestrator = createAiOrchestrator({
      knowledge: { buildContext: async () => "" },
      generateReply: async () => ({ text: "Te paso el presupuesto", imageUrls: [], orderAction: { type: "QUOTE", items: [{ productId: "a", quantity: 1 }] }, inputTokens: 1, outputTokens: 1 }),
      orders: {
        buildContext: async () => "",
        confirmIfRequested: async () => ({ handled: false }),
        prepare: async () => ({ text: "" }),
        quote: async () => ({ text: "Presupuesto N.º 0001", document: { url: quote.url, filename: "Presupuesto 0001.pdf" }, quote, handoffReason: "Falta el precio de B" }),
      },
      persistAssistantReply,
      registerTokenUsage: async () => ({ totalTokens: 2 }),
      sendReply,
      requestHandoff,
    });
    await orchestrator.processConversation({ assistantId: "a", conversationId: "c", globalTenantId: "t", channel: "WHATSAPP", latestUserText: "precio", canRunAi: true, handoffActive: false });
    expect(persistAssistantReply).toHaveBeenCalledWith(expect.objectContaining({ text: "Presupuesto N.º 0001", quote }));
    expect(sendReply).toHaveBeenCalledWith(expect.objectContaining({ document: { url: quote.url, filename: "Presupuesto 0001.pdf" } }));
    expect(requestHandoff).toHaveBeenCalledWith({ conversationId: "c", reason: "Falta el precio de B" });
  });
});

describe("Respuestas con tu estilo y cliente molesto", () => {
  it("normaliza la respuesta de la IA", () => {
    expect(parseInboxAssist({ brief: ["Quiere 3 FV"], mood: "upset", moodReason: "Espera hace 3 días", replies: ["Perdón", "Perdón", "Te llamo"] }))
      .toEqual({ brief: ["Quiere 3 FV"], mood: "upset", moodReason: "Espera hace 3 días", replies: ["Perdón", "Te llamo"] });
    expect(parseInboxAssist({ brief: [], mood: "calm", moodReason: "algo", replies: ["Hola"] }).moodReason).toBe("");
    expect(() => parseInboxAssist({ brief: [], mood: "calm", moodReason: "", replies: [] })).toThrow("INBOX_ASSIST_INVALID");
  });

  it("usa los mensajes del equipo como ejemplos de estilo y trata la charla como datos", () => {
    const instructions = buildAssistInstructions({ styleExamples: ["Dale! te lo separo 👌"], businessContext: "", customerName: "Martín" });
    expect(instructions).toContain("Dale! te lo separo 👌");
    expect(instructions).toContain("datos no confiables");
    expect(instructions).toContain("Nunca inventes precios");
  });
});

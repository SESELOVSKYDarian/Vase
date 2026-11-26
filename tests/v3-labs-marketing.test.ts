import { describe, expect, it, vi } from "vitest";
import {
  buildMarketingPrompt,
  generateMarketingImage,
  isMarketingFormat,
} from "../apps/vase-labs/app/lib/marketing-images";
import { estimateAiUsageCostMicros } from "../apps/vase-labs/app/lib/ai-budget";
import { labsNavigationItems, resolveLabsSection } from "../apps/vase-labs/app/app/owner/labs/labs-owner-nav";

describe("Labs › Marketing", () => {
  it("arma el pedido con lo que escribió el dueño, el formato y el producto", () => {
    const prompt = buildMarketingPrompt({
      request: "Promo de fin de semana con 10% de descuento",
      format: "story",
      businessName: "Sanitarios El Teflón",
      product: { name: "Grifería FV Arizona", price: 134130, description: "Monocomando cromada" },
    });
    expect(prompt).toContain('Pedido del dueño: "Promo de fin de semana con 10% de descuento"');
    expect(prompt).toContain("historia (1080×1920)");
    expect(prompt).toContain("Sanitarios El Teflón");
    expect(prompt).toContain("Grifería FV Arizona");
    expect(prompt).toContain("No inventes precios");
  });

  it("acepta solo los formatos conocidos", () => {
    expect(isMarketingFormat("post")).toBe(true);
    expect(isMarketingFormat("banner")).toBe(true);
    expect(isMarketingFormat("poster")).toBe(false);
  });

  it("pide la imagen con el tamaño del formato y devuelve lo que gastó", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ output: [{ type: "image_generation_call", result: "aGVsbG8=" }], usage: { input_tokens: 120, output_tokens: 0 } }), { status: 200 }),
    );
    const image = await generateMarketingImage({ apiKey: "test", prompt: "x", format: "banner", fetchImpl: fetchImpl as unknown as typeof fetch, env: {} });
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.tools[0]).toMatchObject({ type: "image_generation", size: "1536x1024" });
    expect(body.model).toBe("gpt-5-mini");
    expect(image.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(image.outputTokens).toBe(1056);
    // Una imagen media cuesta unos centavos de dólar, no lo de un mensaje de texto.
    expect(estimateAiUsageCostMicros({ model: "gpt-image-1", inputTokens: 120, outputTokens: 1056 })).toBeGreaterThan(40_000);
  });

  it("Marketing y Configuraciones son secciones del menú de Labs", () => {
    expect(labsNavigationItems.map((item) => item.id)).toEqual(["inicio", "conversaciones", "pedidos", "marketing", "asistente", "configuraciones"]);
    expect(resolveLabsSection("/owner/marketing")).toBe("marketing");
    expect(resolveLabsSection("/owner/configuraciones")).toBe("configuraciones");
    expect(resolveLabsSection("/owner/channels")).toBe("configuraciones");
    expect(resolveLabsSection("/owner/settings")).toBe("ajustes");
  });
});

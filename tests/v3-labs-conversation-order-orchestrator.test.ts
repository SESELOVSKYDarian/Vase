import { describe, expect, it, vi } from "vitest";
import { createConversationOrderOrchestrator } from "../apps/vase-labs/app/lib/conversation-order-orchestrator";

const activeDraft = {
  id: "draft_1",
  state: "AWAITING_CONFIRMATION" as const,
  conversationId: "conversation_1",
  globalTenantId: "tenant_1",
  channel: "WHATSAPP" as const,
  items: [{ productId: "product_1004", quantity: 1 }],
  customer: { name: "Darian", phone: "2234390415" },
  fulfillment: { type: "PICKUP" as const, branchId: "branch_1" },
  quoteHash: "hash",
  quoteVersion: 1,
  confirmationCodeHash: "legacy",
  confirmationSalt: "legacy",
  expiresAt: new Date("2026-07-24T16:00:00.000Z"),
  idempotencyKey: "conversation_1:rev_1",
  notes: null,
};

describe("Labs conversation order orchestrator", () => {
  it("builds chronological bounded history and preserves the active draft", async () => {
    const service = createConversationOrderOrchestrator({
      loadHistory: vi.fn(async () => [
        { role: "user", content: "Quiero una boquilla" },
        { role: "assistant", content: "¿Retiro o envío?" },
        { role: "user", content: "Retiro" },
      ]),
      findActiveDraft: vi.fn(async () => activeDraft),
      prepareDraft: vi.fn(),
      confirmDraft: vi.fn(),
    });

    const context = await service.buildContext("conversation_1");

    expect(context).toContain("Cliente: Quiero una boquilla");
    expect(context).toContain("IA: ¿Retiro o envío?");
    expect(context.indexOf("Quiero una boquilla")).toBeLessThan(context.indexOf("Retiro"));
    expect(context).toContain("Estado del pedido: esperando confirmacion");
    expect(context).toContain("product_1004 x 1");
  });

  it("prepares a Business quote and returns a server-authored confirmation summary", async () => {
    const prepareDraft = vi.fn(async () => ({
      draft: activeDraft,
      quote: {
        valid: true,
        currency: "ARS",
        subtotal: 9614.15,
        shippingAmount: 0,
        total: 9614.15,
        items: [{
          productId: "product_1004",
          sku: "1004",
          name: "BOQUILLA 20 MM",
          quantity: 1,
          unitPrice: 9614.15,
          totalAmount: 9614.15,
        }],
      },
      expiresAt: new Date("2026-07-24T16:00:00.000Z"),
    }));
    const service = createConversationOrderOrchestrator({
      loadHistory: vi.fn(async () => []),
      findActiveDraft: vi.fn(async () => null),
      prepareDraft,
      confirmDraft: vi.fn(),
    });

    const result = await service.prepare({
      assistantId: "assistant_1",
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
      channel: "WHATSAPP",
      action: {
        type: "PREPARE",
        items: [{ productId: "product_1004", quantity: 1 }],
        customer: { name: "Darian", phone: "2234390415" },
        fulfillment: { type: "PICKUP", branchId: "branch_1" },
      },
    });

    expect(prepareDraft).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        items: [{ productId: "product_1004", quantity: 1 }],
        fulfillment: { type: "PICKUP", branchId: "branch_1" },
      }),
    }));
    expect(result.text).toContain("BOQUILLA 20 MM");
    expect(result.text.replace(/\s/g, "")).toContain("$9.614,15");
    expect(result.text).toContain("¿Confirmás el pedido?");
    expect(result.text).not.toContain("CONFIRMAR PEDIDO");
  });

  it("creates an active order after a natural explicit confirmation", async () => {
    const confirmDraft = vi.fn(async () => ({
      ok: true as const,
      order: { order: { id: "order_1", orderNumber: "V-1042" } },
    }));
    const service = createConversationOrderOrchestrator({
      loadHistory: vi.fn(async () => []),
      findActiveDraft: vi.fn(async () => activeDraft),
      prepareDraft: vi.fn(),
      confirmDraft,
    });

    const result = await service.confirmIfRequested({
      conversationId: "conversation_1",
      userText: "Sí, acepto el pedido",
    });

    expect(confirmDraft).toHaveBeenCalledOnce();
    expect(result).toEqual({
      handled: true,
      text: "Pedido confirmado. Tu número de pedido es V-1042.",
    });
  });

  it("does not consume a greeting while a draft is active", async () => {
    const confirmDraft = vi.fn();
    const service = createConversationOrderOrchestrator({
      loadHistory: vi.fn(async () => []),
      findActiveDraft: vi.fn(async () => activeDraft),
      prepareDraft: vi.fn(),
      confirmDraft,
    });

    await expect(service.confirmIfRequested({
      conversationId: "conversation_1",
      userText: "Hola",
    })).resolves.toEqual({ handled: false });
    expect(confirmDraft).not.toHaveBeenCalled();
  });
});

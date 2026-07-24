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
      loadFulfillment: vi.fn(async () => ({ branches: [], deliveryZones: [] })),
      findActiveDraft: vi.fn(async () => activeDraft),
      prepareDraft: vi.fn(),
      confirmDraft: vi.fn(),
    });

    const context = await service.buildContext({
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
    });

    expect(context).toContain("Cliente: Quiero una boquilla");
    expect(context).toContain("IA: ¿Retiro o envío?");
    expect(context.indexOf("Quiero una boquilla")).toBeLessThan(context.indexOf("Retiro"));
    expect(context).toContain("Estado del pedido: esperando confirmacion");
    expect(context).toContain("product_1004 x 1");
  });

  it("includes Business branch ids and suggests the branch matching the customer locality", async () => {
    const service = createConversationOrderOrchestrator({
      loadHistory: vi.fn(async () => [
        { role: "user", content: "Estoy en Mar del Plata y quiero retirar acá" },
      ]),
      loadFulfillment: vi.fn(async () => ({
        branches: [
          {
            id: "branch_central",
            name: "El Teflón (Central)",
            address: "6657 Avenida Pedro Luro, Mar del Plata, Buenos Aires",
            hours: "Lunes a viernes de 08:00 a 17:00",
          },
          {
            id: "branch_necochea",
            name: "El Teflón (Necochea)",
            address: "2743 Calle 57, Necochea, Buenos Aires",
            hours: "Lunes a viernes de 08:00 a 17:00",
          },
        ],
        deliveryZones: [],
      })),
      findActiveDraft: vi.fn(async () => null),
      prepareDraft: vi.fn(),
      confirmDraft: vi.fn(),
    });

    const context = await service.buildContext({
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
    });

    expect(context).toContain("ID interno para orderAction: branch_central");
    expect(context).toContain("ID interno para orderAction: branch_necochea");
    expect(context).toContain("Sucursal sugerida por localidad: El Teflón (Central) [branch_central]");
    expect(context).toContain("Nunca le pidas al cliente IDs internos");
  });

  it("keeps ordinary replies available when fulfillment synchronization is temporarily unavailable", async () => {
    const service = createConversationOrderOrchestrator({
      loadHistory: vi.fn(async () => [{ role: "user", content: "¿Qué horario tienen?" }]),
      loadFulfillment: vi.fn(async () => { throw new Error("BUSINESS_ORDER_CLIENT_UNAVAILABLE"); }),
      findActiveDraft: vi.fn(async () => null),
      prepareDraft: vi.fn(),
      confirmDraft: vi.fn(),
    });

    await expect(service.buildContext({
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
    })).resolves.toContain("Sucursales sincronizadas desde Business: temporalmente no disponibles.");
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
      loadFulfillment: vi.fn(async () => ({
        branches: [{
          id: "branch_1",
          name: "El Teflón (Central)",
          address: "6657 Avenida Pedro Luro, Mar del Plata",
          hours: "Lunes a viernes de 08:00 a 17:00",
        }],
        deliveryZones: [],
      })),
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
    expect(result.text).toContain("Retiro: El Teflón (Central)");
    expect(result.text).toContain("6657 Avenida Pedro Luro, Mar del Plata");
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
      loadFulfillment: vi.fn(async () => ({ branches: [], deliveryZones: [] })),
      findActiveDraft: vi.fn(async () => activeDraft),
      prepareDraft: vi.fn(),
      confirmDraft,
    });

    const result = await service.confirmIfRequested({
      assistantId: "assistant_1",
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
      channel: "WHATSAPP",
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
      loadFulfillment: vi.fn(async () => ({ branches: [], deliveryZones: [] })),
      findActiveDraft: vi.fn(async () => activeDraft),
      prepareDraft: vi.fn(),
      confirmDraft,
    });

    await expect(service.confirmIfRequested({
      assistantId: "assistant_1",
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
      channel: "WHATSAPP",
      userText: "Hola",
    })).resolves.toEqual({ handled: false });
    expect(confirmDraft).not.toHaveBeenCalled();
  });

  it("requotes the existing draft when Business changed before confirmation", async () => {
    const prepareDraft = vi.fn(async () => ({
      draft: activeDraft,
      quote: {
        valid: true,
        currency: "ARS",
        subtotal: 10000,
        shippingAmount: 0,
        total: 10000,
        items: [{
          productId: "product_1004",
          name: "BOQUILLA 20 MM",
          quantity: 1,
          totalAmount: 10000,
        }],
      },
    }));
    const service = createConversationOrderOrchestrator({
      loadHistory: vi.fn(async () => []),
      loadFulfillment: vi.fn(async () => ({ branches: [], deliveryZones: [] })),
      findActiveDraft: vi.fn(async () => activeDraft),
      prepareDraft,
      confirmDraft: vi.fn(async () => ({ ok: false as const, reason: "QUOTE_CHANGED" })),
    });

    const result = await service.confirmIfRequested({
      assistantId: "assistant_1",
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
      channel: "WHATSAPP",
      userText: "Acepto",
    });

    expect(prepareDraft).toHaveBeenCalledWith(expect.objectContaining({
      assistantId: "assistant_1",
      input: expect.objectContaining({
        items: activeDraft.items,
        customer: activeDraft.customer,
        fulfillment: activeDraft.fulfillment,
      }),
    }));
    expect(result).toMatchObject({
      handled: true,
      text: expect.stringContaining("$ 10.000,00"),
    });
  });
});

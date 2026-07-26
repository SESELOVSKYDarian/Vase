import { describe, expect, it, vi } from "vitest";
import {
  confirmConversationOrderDraft,
  prepareConversationOrderDraft,
} from "../apps/vase-labs/app/lib/conversation-order-tools";

describe("Labs conversation order tools", () => {
  it("quotes with Business and stores a draft awaiting exact confirmation", async () => {
    const saveDraft = vi.fn(async (draft) => ({ ...draft, id: "draft_1" }));
    const result = await prepareConversationOrderDraft({
      assistantId: "assistant_1",
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
      channel: "WHATSAPP",
      input: {
        items: [{ productId: "prod_1", quantity: 1 }],
        customer: { name: "Ana" },
        fulfillment: { type: "DELIVERY" },
      },
    }, {
      now: () => new Date("2026-07-23T12:00:00.000Z"),
      createCode: () => "4821",
      createSalt: () => "salt",
      business: {
        quote: vi.fn(async () => ({ valid: true, quoteHash: "quote_hash_1", quoteVersion: 5, total: 1200, currency: "ARS" })),
        create: vi.fn(),
      },
      repository: {
        saveDraft,
        findActiveDraft: vi.fn(),
        markConfirmed: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    expect(result.confirmationPhrase).toBe("CONFIRMAR PEDIDO 4821");
    expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({
      state: "AWAITING_CONFIRMATION",
      idempotencyKey: "conversation_1:rev_1",
      quoteHash: "quote_hash_1",
      quoteVersion: 5,
    }));
  });

  it("does not create an order from an ambiguous acknowledgement", async () => {
    const create = vi.fn();
    const result = await confirmConversationOrderDraft({
      conversationId: "conversation_1",
      userText: "ok",
    }, {
      now: () => new Date("2026-07-23T12:00:00.000Z"),
      business: {
        quote: vi.fn(async () => ({ valid: true, quoteHash: "quote_hash_1", quoteVersion: 5 })),
        create,
      },
      repository: {
        findActiveDraft: vi.fn(async () => ({
          id: "draft_1",
          state: "AWAITING_CONFIRMATION",
          conversationId: "conversation_1",
          globalTenantId: "tenant_1",
          channel: "WHATSAPP",
          items: [{ productId: "prod_1", quantity: 1 }],
          customer: {},
          fulfillment: { type: "DELIVERY" },
          quoteHash: "quote_hash_1",
          quoteVersion: 5,
          confirmationCodeHash: "b1097226b2f2cfd33f9f27ff8d9c08e51d8174909f3907a24b5e17462b09901c",
          confirmationSalt: "salt",
          expiresAt: new Date("2026-07-23T13:00:00.000Z"),
          idempotencyKey: "conversation_1:rev_1",
          notes: null,
        })),
        saveDraft: vi.fn(),
        markConfirmed: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    expect(result).toEqual({ ok: false, reason: "CONFIRMATION_REQUIRED" });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the active draft after an explicit natural confirmation", async () => {
    const create = vi.fn(async () => ({ order: { id: "order_1", orderNumber: "V-1042" } }));
    const markConfirmed = vi.fn();
    const result = await confirmConversationOrderDraft({
      conversationId: "conversation_1",
      userText: "Sí, acepto el pedido",
    }, {
      now: () => new Date("2026-07-23T12:00:00.000Z"),
      business: {
        quote: vi.fn(async () => ({ valid: true, quoteHash: "quote_hash_1", quoteVersion: 5 })),
        create,
      },
      repository: {
        findActiveDraft: vi.fn(async () => ({
          id: "draft_1",
          state: "AWAITING_CONFIRMATION",
          conversationId: "conversation_1",
          globalTenantId: "tenant_1",
          channel: "WHATSAPP",
          items: [{ productId: "prod_1", quantity: 1 }],
          customer: {},
          fulfillment: {
            type: "PICKUP",
            pickupLabel: "El Teflón (Central)",
            address: "6657 Avenida Pedro Luro, Mar del Plata",
          },
          quoteHash: "quote_hash_1",
          quoteVersion: 5,
          confirmationCodeHash: "legacy_hash",
          confirmationSalt: "legacy_salt",
          expiresAt: new Date("2026-07-23T13:00:00.000Z"),
          idempotencyKey: "conversation_1:rev_1",
          notes: null,
        })),
        saveDraft: vi.fn(),
        markConfirmed,
        markFailed: vi.fn(),
      },
    });

    expect(result.ok).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      notes: expect.stringContaining("El Teflón (Central)"),
    }));
    expect(markConfirmed).toHaveBeenCalledWith({
      draftId: "draft_1",
      businessOrderId: "order_1",
      businessOrderNumber: "V-1042",
    });
  });
});

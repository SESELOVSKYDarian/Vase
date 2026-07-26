import { describe, expect, it } from "vitest";
import {
  buildConfirmationPhrase,
  createConfirmationCodeHash,
  isExactConfirmation,
  isExplicitOrderConfirmation,
  normalizeOrderDraftInput,
  resolveDraftTransition,
} from "../apps/vase-labs/app/lib/conversation-order-draft";

describe("Labs conversation order drafts", () => {
  it("normalizes necessary order data and rejects empty carts", () => {
    expect(() => normalizeOrderDraftInput({
      items: [{ productId: "prod_1", quantity: 2 }],
      customer: { name: "Ana", phone: "+5491111111111" },
      fulfillment: { type: "DELIVERY" },
    })).not.toThrow();

    expect(() => normalizeOrderDraftInput({
      items: [],
      customer: {},
      fulfillment: { type: "DELIVERY" },
    })).toThrow("ORDER_ITEMS_REQUIRED");
  });

  it("requires exact confirmation phrase and code", () => {
    const hash = createConfirmationCodeHash("4821", "salt");

    expect(buildConfirmationPhrase("4821")).toBe("CONFIRMAR PEDIDO 4821");
    expect(isExactConfirmation("CONFIRMAR PEDIDO 4821", hash, "salt")).toBe(true);
    expect(isExactConfirmation("confirmar pedido 4821", hash, "salt")).toBe(false);
    expect(isExactConfirmation("CONFIRMAR PEDIDO 4821 por favor", hash, "salt")).toBe(false);
  });

  it.each([
    "Confirmo el pedido",
    "acepto el pedido",
    "Sí, hacelo",
    "Acepto",
    "Envialo",
    "dale, quiero hacer el pedido",
    "me armas el pedido?",
    "me confirmas el pedido?",
    "confirmar pedido 4821",
  ])("accepts an explicit natural confirmation: %s", (text) => {
    expect(isExplicitOrderConfirmation(text)).toBe(true);
  });

  it.each([
    "Hola",
    "ok",
    "tal vez",
    "¿Confirmo el pedido?",
    "no confirmo el pedido",
    "quiero cambiar la cantidad",
  ])("rejects an ambiguous, negative or unrelated message: %s", (text) => {
    expect(isExplicitOrderConfirmation(text)).toBe(false);
  });

  it("allows an explicit natural confirmation for a current quote", () => {
    const result = resolveDraftTransition({
      state: "AWAITING_CONFIRMATION",
      quoteHash: "hash",
      quoteVersion: 1,
      expiresAt: new Date("2026-07-23T13:00:00.000Z"),
      now: new Date("2026-07-23T12:00:00.000Z"),
      latestQuoteHash: "hash",
      latestQuoteVersion: 1,
      userText: "Sí, acepto el pedido",
      confirmationCodeHash: createConfirmationCodeHash("4821", "salt"),
      salt: "salt",
    });

    expect(result).toEqual({ allowed: true });
  });

  it("invalidates a draft when the quote changes before confirmation", () => {
    const result = resolveDraftTransition({
      state: "AWAITING_CONFIRMATION",
      quoteHash: "old_hash",
      quoteVersion: 1,
      expiresAt: new Date("2026-07-23T13:00:00.000Z"),
      now: new Date("2026-07-23T12:00:00.000Z"),
      latestQuoteHash: "new_hash",
      latestQuoteVersion: 2,
      userText: "CONFIRMAR PEDIDO 4821",
      confirmationCodeHash: createConfirmationCodeHash("4821", "salt"),
      salt: "salt",
    });

    expect(result).toEqual({ allowed: false, reason: "QUOTE_CHANGED" });
  });

  it("allows creation only while unexpired and exactly confirmed", () => {
    const result = resolveDraftTransition({
      state: "AWAITING_CONFIRMATION",
      quoteHash: "hash",
      quoteVersion: 1,
      expiresAt: new Date("2026-07-23T13:00:00.000Z"),
      now: new Date("2026-07-23T12:00:00.000Z"),
      latestQuoteHash: "hash",
      latestQuoteVersion: 1,
      userText: "CONFIRMAR PEDIDO 4821",
      confirmationCodeHash: createConfirmationCodeHash("4821", "salt"),
      salt: "salt",
    });

    expect(result).toEqual({ allowed: true });
  });
});

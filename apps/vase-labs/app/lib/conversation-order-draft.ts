import { createHash, randomInt } from "node:crypto";

export type ConversationOrderDraftState =
  | "COLLECTING"
  | "QUOTED"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "EXPIRED"
  | "CANCELLED";

export type NormalizedOrderDraftInput = {
  items: Array<{ productId: string; quantity: number }>;
  customer: Record<string, unknown>;
  fulfillment: {
    type: "DELIVERY" | "PICKUP";
    branchId?: string | null;
    pickupLabel?: string | null;
    address?: string | null;
  };
  notes?: string | null;
};

export function normalizeOrderDraftInput(input: {
  items?: Array<{ productId?: string | null; quantity?: number | null }> | null;
  customer?: Record<string, unknown> | null;
  fulfillment?: {
    type?: string | null;
    branchId?: string | null;
    pickupLabel?: string | null;
    address?: string | null;
  } | null;
  notes?: string | null;
}): NormalizedOrderDraftInput {
  const items = (input.items ?? [])
    .filter((item) => item?.productId)
    .map((item) => ({
      productId: String(item.productId),
      quantity: Math.max(1, Math.floor(Number(item.quantity ?? 1))),
    }));

  if (!items.length) throw new Error("ORDER_ITEMS_REQUIRED");

  const fulfillmentType = input.fulfillment?.type === "PICKUP" ? "PICKUP" : "DELIVERY";
  return {
    items,
    customer: input.customer ?? {},
    fulfillment: {
      type: fulfillmentType,
      branchId: input.fulfillment?.branchId ?? null,
      pickupLabel: input.fulfillment?.pickupLabel?.trim() || null,
      address: input.fulfillment?.address?.trim() || null,
    },
    notes: input.notes?.trim() || null,
  };
}

export function createConfirmationCode() {
  return String(randomInt(0, 10_000)).padStart(4, "0");
}

export function createConfirmationCodeHash(code: string, salt: string) {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export function buildConfirmationPhrase(code: string) {
  return `CONFIRMAR PEDIDO ${code}`;
}

export function isExactConfirmation(text: string, confirmationCodeHash: string, salt: string) {
  const match = /^CONFIRMAR PEDIDO ([0-9]{4})$/.exec(text.trim());
  if (!match) return false;
  return createConfirmationCodeHash(match[1], salt) === confirmationCodeHash;
}

function normalizeConfirmationText(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isExplicitOrderConfirmation(text: string) {
  const raw = text.trim();
  const normalized = normalizeConfirmationText(raw);
  if (!normalized) return false;
  if (/\b(no|nunca|todavia no|no quiero|cancelar|cambiar|modificar)\b/.test(normalized)) {
    return false;
  }

  return [
    /^(si )?(confirmo|acepto)( el)? pedido$/,
    /^(si )?(confirmo|acepto)( el)? pedido por favor$/,
    /^(si )?(confirmo|acepto)$/,
    /^(si )?(dale )?(hacelo|hazlo)$/,
    /^(si )?(dale )?(envialo|mandalo)$/,
    /^(dale )?quiero (hacer|realizar|confirmar)( el)? pedido$/,
    /^(si )?(me )?(armas|arma|prepara|preparame|hace|haceme)( el)? pedido\??$/,
    /^confirmar pedido [0-9]{4}$/,
  ].some((pattern) => pattern.test(normalized));
}

export function resolveDraftTransition(input: {
  state: ConversationOrderDraftState;
  quoteHash: string | null;
  quoteVersion: number | null;
  latestQuoteHash: string;
  latestQuoteVersion: number;
  expiresAt: Date;
  now: Date;
  userText: string;
  confirmationCodeHash: string;
  salt: string;
}) {
  if (input.state !== "AWAITING_CONFIRMATION") {
    return { allowed: false as const, reason: "NOT_AWAITING_CONFIRMATION" as const };
  }
  if (input.expiresAt <= input.now) {
    return { allowed: false as const, reason: "EXPIRED" as const };
  }
  if (input.quoteHash !== input.latestQuoteHash || input.quoteVersion !== input.latestQuoteVersion) {
    return { allowed: false as const, reason: "QUOTE_CHANGED" as const };
  }
  if (
    !isExplicitOrderConfirmation(input.userText)
    && !isExactConfirmation(input.userText, input.confirmationCodeHash, input.salt)
  ) {
    return { allowed: false as const, reason: "CONFIRMATION_REQUIRED" as const };
  }
  return { allowed: true as const };
}

export function buildDraftIdempotencyKey(conversationId: string, revision: number) {
  return `${conversationId}:rev_${revision}`;
}

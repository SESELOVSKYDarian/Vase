// Parte de openai-reply-generator.ts: parseOrderAction, extractOutputText, hasRefusal, readUsageToken, readOpenAiError.
import { AiOrderAction } from "./resolve-open-ai-model-profile";

export function parseOrderAction(value: unknown): AiOrderAction {
  if (value == null) return { type: "NONE" };
  const source = value as {
    type?: unknown;
    items?: unknown;
    customer?: unknown;
    fulfillment?: unknown;
    notes?: unknown;
  };
  if (source.type === "NONE") return { type: "NONE" };
  if ((source.type !== "PREPARE" && source.type !== "QUOTE") || !Array.isArray(source.items)) {
    throw new Error("OPENAI_RESPONSE_INVALID");
  }
  const items = source.items.map((item) => {
    const candidate = item as { productId?: unknown; quantity?: unknown };
    if (
      typeof candidate.productId !== "string"
      || !candidate.productId.trim()
      || !Number.isInteger(candidate.quantity)
      || Number(candidate.quantity) < 1
    ) {
      throw new Error("OPENAI_RESPONSE_INVALID");
    }
    return { productId: candidate.productId.trim(), quantity: Number(candidate.quantity) };
  });
  const customer = source.customer as { name?: unknown; phone?: unknown; email?: unknown } | null;
  if (source.type === "QUOTE") {
    // Un presupuesto no necesita datos de entrega: si no hay productos, no se arma y la charla sigue igual.
    if (items.length === 0) return { type: "NONE" };
    return {
      type: "QUOTE",
      items: items.slice(0, 30),
      ...(typeof customer?.name === "string" && customer.name.trim() ? { customerName: customer.name.trim().slice(0, 120) } : {}),
      ...(typeof source.notes === "string" && source.notes.trim() ? { notes: source.notes.trim().slice(0, 500) } : {}),
    };
  }
  const fulfillment = source.fulfillment as {
    type?: unknown;
    branchId?: unknown;
    pickupLabel?: unknown;
    address?: unknown;
  } | null;
  if (
    items.length === 0
    || typeof customer?.name !== "string"
    || !customer.name.trim()
    || typeof customer.phone !== "string"
    || !customer.phone.trim()
    || (fulfillment?.type !== "DELIVERY" && fulfillment?.type !== "PICKUP")
  ) {
    throw new Error("OPENAI_RESPONSE_INVALID");
  }
  return {
    type: "PREPARE",
    items,
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      ...(typeof customer.email === "string" && customer.email.trim()
        ? { email: customer.email.trim() }
        : {}),
    },
    fulfillment: {
      type: fulfillment.type,
      ...(typeof fulfillment.branchId === "string" && fulfillment.branchId.trim()
        ? { branchId: fulfillment.branchId.trim() }
        : {}),
      ...(typeof fulfillment.pickupLabel === "string" && fulfillment.pickupLabel.trim()
        ? { pickupLabel: fulfillment.pickupLabel.trim() }
        : {}),
      ...(typeof fulfillment.address === "string" && fulfillment.address.trim()
        ? { address: fulfillment.address.trim() }
        : {}),
    },
    ...(typeof source.notes === "string" && source.notes.trim()
      ? { notes: source.notes.trim() }
      : {}),
  };
}

export function extractOutputText(payload: unknown): string {
  const source = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> } | null;

  if (typeof source?.output_text === "string") {
    return source.output_text.trim();
  }

  return (source?.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => typeof text === "string")
    .join("\n")
    .trim();
}

export function hasRefusal(payload: unknown): boolean {
  const source = payload as {
    refusal?: unknown;
    output?: Array<{ content?: Array<{ type?: unknown; refusal?: unknown }> }>;
  } | null;
  if (typeof source?.refusal === "string" && source.refusal.trim()) return true;
  return (source?.output ?? []).some((item) =>
    (item.content ?? []).some((content) =>
      content.type === "refusal" || (typeof content.refusal === "string" && Boolean(content.refusal.trim())),
    ),
  );
}

export function readUsageToken(payload: unknown, key: "input_tokens" | "output_tokens"): number {
  const value = (payload as { usage?: Record<string, unknown> } | null)?.usage?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function readOpenAiError(payload: unknown): string | null {
  const message = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" && message ? message : null;
}

// Parte de conversation-order-orchestrator.ts: ActiveOrderDraft, ConversationMessage, FulfillmentBranch, OrderOrchestratorDependencies, localityStopWords, normalizeSearchText y más.
import { type LabsChannel } from "@vase/contracts";

export type ActiveOrderDraft = {
  state: string;
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

export type ConversationMessage = {
  role: string;
  content: string;
};

export type FulfillmentBranch = {
  id: string;
  name: string;
  address: string | null;
  hours: string | null;
};

export type OrderOrchestratorDependencies = {
  loadHistory(conversationId: string): Promise<ConversationMessage[]>;
  loadFulfillment(globalTenantId: string): Promise<unknown>;
  findActiveDraft(conversationId: string): Promise<ActiveOrderDraft | null>;
  createLocalOrder?(input: {
    assistantId: string;
    conversationId: string;
    globalTenantId: string;
    channel: LabsChannel;
    order: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  prepareDraft(input: {
    assistantId: string;
    conversationId: string;
    globalTenantId: string;
    channel: LabsChannel;
    input: {
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
  }): Promise<{ quote: unknown; confirmationPhrase?: string | null }>;
  confirmDraft(input: {
    conversationId: string;
    userText: string;
  }): Promise<{ ok: boolean; reason?: string; order?: unknown }>;
};

export const localityStopWords = new Set([
  "aca", "alla", "avenida", "buenos", "aires", "calle", "central", "comercio",
  "del", "desde", "donde", "el", "en", "estoy", "la", "las", "los", "para",
  "quiero", "retirar", "retiro", "sucursal", "teflon", "una", "y",
]);

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchTokens(value: string) {
  return new Set(
    normalizeSearchText(value)
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !localityStopWords.has(token)),
  );
}

export function readBranches(value: unknown): FulfillmentBranch[] {
  const branches = (value as { branches?: unknown } | null)?.branches;
  if (!Array.isArray(branches)) return [];
  return branches.flatMap((raw) => {
    const branch = raw as Record<string, unknown>;
    if (typeof branch.id !== "string" || typeof branch.name !== "string") return [];
    return [{
      id: branch.id,
      name: branch.name,
      address: typeof branch.address === "string" ? branch.address : null,
      hours: typeof branch.hours === "string" ? branch.hours : null,
    }];
  });
}

export function suggestBranch(branches: FulfillmentBranch[], customerText: string) {
  const customerTokens = searchTokens(customerText);
  const ranked = branches
    .map((branch) => {
      const branchTokens = searchTokens(`${branch.name} ${branch.address ?? ""}`);
      const score = [...customerTokens].filter((token) => branchTokens.has(token)).length;
      return { branch, score };
    })
    .sort((left, right) => right.score - left.score);
  if (!ranked[0] || ranked[0].score === 0 || ranked[0].score === ranked[1]?.score) return null;
  return ranked[0].branch;
}

export function fulfillmentContext(value: unknown, history: ConversationMessage[]) {
  if (value == null) {
    return "Sucursales sincronizadas desde Business: temporalmente no disponibles.";
  }
  const branches = readBranches(value);
  if (branches.length === 0) return "Sucursales sincronizadas desde Business: ninguna disponible.";
  const customerText = history
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
  const suggested = suggestBranch(branches, customerText);
  return [
    "Sucursales sincronizadas desde Vase Business:",
    ...branches.map((branch) => [
      `- ${branch.name}`,
      `  ID interno para orderAction: ${branch.id}`,
      branch.address ? `  Dirección: ${branch.address}` : null,
      branch.hours ? `  Horarios: ${branch.hours}` : null,
    ].filter(Boolean).join("\n")),
    suggested
      ? `Sucursal sugerida por localidad: ${suggested.name} [${suggested.id}]`
      : "No hay una única sucursal sugerida; preguntá localidad o dirección, nunca un ID.",
    "Nunca le pidas al cliente IDs internos. Usalos solamente dentro de orderAction.",
  ].join("\n");
}

export function messageAuthor(role: string) {
  if (role === "system") return "Sistema";
  if (role === "assistant" || role === "human_agent") return role === "assistant" ? "IA" : "Equipo";
  return "Cliente";
}

export function formatMoney(value: unknown, currency: string) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function fulfillmentSummary(
  fulfillment: {
    type: "DELIVERY" | "PICKUP";
    branchId?: string | null;
    pickupLabel?: string | null;
    address?: string | null;
  },
  value: unknown,
) {
  if (fulfillment.type === "DELIVERY") return "Modalidad: Envío";
  const branch = readBranches(value).find((candidate) => candidate.id === fulfillment.branchId);
  if (!branch && fulfillment.pickupLabel) {
    return `Retiro: ${fulfillment.pickupLabel}${fulfillment.address ? ` — ${fulfillment.address}` : ""}`;
  }
  if (!branch) return "Modalidad: Retiro en sucursal";
  return `Retiro: ${branch.name}${branch.address ? ` — ${branch.address}` : ""}`;
}

export function quoteSummary(
  value: unknown,
  fulfillment?: {
    type: "DELIVERY" | "PICKUP";
    branchId?: string | null;
    pickupLabel?: string | null;
    address?: string | null;
  },
  fulfillmentOptions?: unknown,
) {
  const quote = value as {
    currency?: unknown;
    subtotal?: unknown;
    shippingAmount?: unknown;
    total?: unknown;
    items?: unknown;
  } | null;
  const currency = typeof quote?.currency === "string" ? quote.currency : "ARS";
  const items = Array.isArray(quote?.items)
    ? quote.items.map((raw) => {
        const item = raw as Record<string, unknown>;
        const name = typeof item.name === "string"
          ? item.name
          : typeof item.sku === "string"
            ? `SKU ${item.sku}`
            : `Producto ${String(item.productId ?? "")}`.trim();
        return `- ${name} x ${Number(item.quantity ?? 1)}: ${formatMoney(item.totalAmount, currency)}`;
      })
    : [];
  return [
    "Resumen del pedido:",
    ...items,
    `Subtotal: ${formatMoney(quote?.subtotal, currency)}`,
    `Envío: ${formatMoney(quote?.shippingAmount, currency)}`,
    `Total: ${formatMoney(quote?.total, currency)}`,
    fulfillment ? fulfillmentSummary(fulfillment, fulfillmentOptions) : null,
    "",
    "¿Confirmás el pedido? Podés responder “confirmo el pedido”, “acepto” o “hacelo”.",
  ].filter((line): line is string => typeof line === "string").join("\n");
}

export function readOrderNumber(value: unknown) {
  const source = value as { order?: { orderNumber?: unknown } } | null;
  return typeof source?.order?.orderNumber === "string" ? source.order.orderNumber : null;
}

export function confirmedOrderText(order: unknown) {
  const orderNumber = readOrderNumber(order);
  return orderNumber
    ? `Pedido confirmado. Tu nÃºmero de pedido es ${orderNumber}.`
    : "Pedido confirmado correctamente.";
}

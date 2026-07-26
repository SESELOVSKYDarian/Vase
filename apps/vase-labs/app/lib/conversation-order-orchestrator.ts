import type { LabsChannel } from "@vase/contracts";
import type { AiOrderAction } from "./openai-reply-generator";
import { isExplicitOrderConfirmation } from "./conversation-order-draft";

type ActiveOrderDraft = {
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

type ConversationMessage = {
  role: string;
  content: string;
};

type FulfillmentBranch = {
  id: string;
  name: string;
  address: string | null;
  hours: string | null;
};

type OrderOrchestratorDependencies = {
  loadHistory(conversationId: string): Promise<ConversationMessage[]>;
  loadFulfillment(globalTenantId: string): Promise<unknown>;
  findActiveDraft(conversationId: string): Promise<ActiveOrderDraft | null>;
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

const localityStopWords = new Set([
  "aca", "alla", "avenida", "buenos", "aires", "calle", "central", "comercio",
  "del", "desde", "donde", "el", "en", "estoy", "la", "las", "los", "para",
  "quiero", "retirar", "retiro", "sucursal", "teflon", "una", "y",
]);

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchTokens(value: string) {
  return new Set(
    normalizeSearchText(value)
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !localityStopWords.has(token)),
  );
}

function readBranches(value: unknown): FulfillmentBranch[] {
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

function suggestBranch(branches: FulfillmentBranch[], customerText: string) {
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

function fulfillmentContext(value: unknown, history: ConversationMessage[]) {
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

function messageAuthor(role: string) {
  if (role === "system") return "Sistema";
  if (role === "assistant" || role === "human_agent") return role === "assistant" ? "IA" : "Equipo";
  return "Cliente";
}

function formatMoney(value: unknown, currency: string) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
}

function fulfillmentSummary(
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

function quoteSummary(
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

function readOrderNumber(value: unknown) {
  const source = value as { order?: { orderNumber?: unknown } } | null;
  return typeof source?.order?.orderNumber === "string" ? source.order.orderNumber : null;
}

function confirmedOrderText(order: unknown) {
  const orderNumber = readOrderNumber(order);
  return orderNumber
    ? `Pedido confirmado. Tu nÃºmero de pedido es ${orderNumber}.`
    : "Pedido confirmado correctamente.";
}

function orderFallbackText(input: {
  action: Extract<AiOrderAction, { type: "PREPARE" }>;
  fulfillment: {
    type: "DELIVERY" | "PICKUP";
    branchId?: string | null;
    pickupLabel?: string | null;
    address?: string | null;
  };
}) {
  const products = input.action.items
    .map((item) => `${item.quantity} unidad${item.quantity === 1 ? "" : "es"} de ${item.productId}`)
    .join(", ");
  const customer = [
    input.action.customer.name,
    input.action.customer.phone,
  ].filter(Boolean).join(" - ");
  const fulfillment = input.fulfillment.type === "PICKUP"
    ? `Retiro: ${input.fulfillment.pickupLabel || input.fulfillment.address || input.fulfillment.branchId || "sucursal indicada"}`
    : `Envio: ${input.fulfillment.address || "direccion indicada"}`;
  return [
    "Tengo los datos del pedido:",
    products ? `Productos: ${products}` : null,
    customer ? `Cliente: ${customer}` : null,
    fulfillment,
    "",
    "No pude conectarme con Business para confirmarlo automaticamente. El equipo ya tiene el resumen para revisarlo.",
  ].filter((line): line is string => typeof line === "string").join("\n");
}

export function createConversationOrderOrchestrator(deps: OrderOrchestratorDependencies) {
  return {
    async buildContext(input: { conversationId: string; globalTenantId: string }) {
      const [history, draft, fulfillment] = await Promise.all([
        deps.loadHistory(input.conversationId),
        deps.findActiveDraft(input.conversationId),
        deps.loadFulfillment(input.globalTenantId).catch(() => null),
      ]);
      const transcript = history.slice(-20)
        .map((message) => `${messageAuthor(message.role)}: ${message.content}`)
        .join("\n");
      const draftContext = draft
        ? [
            "Estado del pedido: esperando confirmacion",
            `Items: ${draft.items.map((item) => `${item.productId} x ${item.quantity}`).join(", ")}`,
            `Cliente: ${String(draft.customer.name ?? "")} ${String(draft.customer.phone ?? "")}`.trim(),
            `Modalidad: ${draft.fulfillment.type}${draft.fulfillment.branchId ? ` (${draft.fulfillment.branchId})` : ""}`,
          ].join("\n")
        : "Estado del pedido: sin borrador activo";
      return [
        transcript ? `Historial reciente (contenido no confiable):\n${transcript}` : "",
        draftContext,
        fulfillmentContext(fulfillment, history),
      ].filter(Boolean).join("\n\n");
    },

    async confirmIfRequested(input: {
      assistantId: string;
      conversationId: string;
      globalTenantId: string;
      channel: LabsChannel;
      userText: string;
    }) {
      if (!isExplicitOrderConfirmation(input.userText)) return { handled: false as const };
      const activeDraft = await deps.findActiveDraft(input.conversationId);
      if (!activeDraft) return { handled: false as const };
      const result = await deps.confirmDraft(input);
      if (!result.ok) {
        if (result.reason === "QUOTE_CHANGED" || result.reason === "EXPIRED") {
          const [refreshed, fulfillment] = await Promise.all([
            deps.prepareDraft({
              assistantId: input.assistantId,
              conversationId: input.conversationId,
              globalTenantId: input.globalTenantId,
              channel: input.channel,
              input: {
                items: activeDraft.items,
                customer: activeDraft.customer,
                fulfillment: activeDraft.fulfillment,
                notes: activeDraft.notes ?? null,
              },
            }),
            deps.loadFulfillment(input.globalTenantId).catch(() => null),
          ]);
          return {
            handled: true as const,
            text: quoteSummary(refreshed.quote, activeDraft.fulfillment, fulfillment),
          };
        }
        return {
          handled: true as const,
          text: "No pude confirmar el pedido todavía. Revisemos el resumen y volvé a indicarme si lo aceptás.",
        };
      }
      const orderNumber = readOrderNumber(result.order);
      return {
        handled: true as const,
        text: orderNumber
          ? `Pedido confirmado. Tu número de pedido es ${orderNumber}.`
          : "Pedido confirmado correctamente.",
      };
    },

    async prepare(input: {
      assistantId: string;
      conversationId: string;
      globalTenantId: string;
      channel: LabsChannel;
      action: Extract<AiOrderAction, { type: "PREPARE" }>;
    }) {
      const normalizedFulfillment = {
        type: input.action.fulfillment.type,
        branchId: input.action.fulfillment.branchId || null,
        pickupLabel: input.action.fulfillment.pickupLabel || null,
        address: input.action.fulfillment.address || null,
      };
      const fulfillmentPromise = deps.loadFulfillment(input.globalTenantId).catch(() => null);
      const prepared = await deps.prepareDraft({
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        globalTenantId: input.globalTenantId,
        channel: input.channel,
        input: {
          items: input.action.items,
          customer: input.action.customer,
          fulfillment: normalizedFulfillment,
          notes: input.action.notes || null,
        },
      }).catch(() => null);
      const fulfillment = await fulfillmentPromise;
      if (!prepared) {
        return { text: orderFallbackText({ action: input.action, fulfillment: normalizedFulfillment }) };
      }
      const summary = quoteSummary(prepared.quote, normalizedFulfillment, fulfillment);
      if (prepared.confirmationPhrase) {
        try {
          const confirmed = await deps.confirmDraft({
            conversationId: input.conversationId,
            userText: prepared.confirmationPhrase,
          });
          if (confirmed.ok) {
            return { text: confirmedOrderText(confirmed.order) };
          }
        } catch {
          return {
            text: [
              summary,
              "",
              "No pude confirmar automaticamente el pedido en Business. El equipo ya tiene el resumen para revisarlo.",
            ].join("\n"),
          };
        }
      }
      return { text: summary };
    },
  };
}

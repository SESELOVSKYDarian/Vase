import type { LabsChannel } from "@vase/contracts";
import type { AiOrderAction } from "./openai-reply-generator";
import { isExplicitOrderConfirmation } from "./conversation-order-draft";

type ActiveOrderDraft = {
  state: string;
  items: Array<{ productId: string; quantity: number }>;
  customer: Record<string, unknown>;
  fulfillment: { type: "DELIVERY" | "PICKUP"; branchId?: string | null };
};

type ConversationMessage = {
  role: string;
  content: string;
};

type OrderOrchestratorDependencies = {
  loadHistory(conversationId: string): Promise<ConversationMessage[]>;
  findActiveDraft(conversationId: string): Promise<ActiveOrderDraft | null>;
  prepareDraft(input: {
    assistantId: string;
    conversationId: string;
    globalTenantId: string;
    channel: LabsChannel;
    input: {
      items: Array<{ productId: string; quantity: number }>;
      customer: Record<string, unknown>;
      fulfillment: { type: "DELIVERY" | "PICKUP"; branchId?: string | null };
      notes?: string | null;
    };
  }): Promise<{ quote: unknown }>;
  confirmDraft(input: {
    conversationId: string;
    userText: string;
  }): Promise<{ ok: boolean; reason?: string; order?: unknown }>;
};

function messageAuthor(role: string) {
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

function quoteSummary(value: unknown) {
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
    "",
    "¿Confirmás el pedido? Podés responder “confirmo el pedido”, “acepto” o “hacelo”.",
  ].join("\n");
}

function readOrderNumber(value: unknown) {
  const source = value as { order?: { orderNumber?: unknown } } | null;
  return typeof source?.order?.orderNumber === "string" ? source.order.orderNumber : null;
}

export function createConversationOrderOrchestrator(deps: OrderOrchestratorDependencies) {
  return {
    async buildContext(conversationId: string) {
      const [history, draft] = await Promise.all([
        deps.loadHistory(conversationId),
        deps.findActiveDraft(conversationId),
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
      ].filter(Boolean).join("\n\n");
    },

    async confirmIfRequested(input: { conversationId: string; userText: string }) {
      if (!isExplicitOrderConfirmation(input.userText)) return { handled: false as const };
      const activeDraft = await deps.findActiveDraft(input.conversationId);
      if (!activeDraft) return { handled: false as const };
      const result = await deps.confirmDraft(input);
      if (!result.ok) {
        if (result.reason === "QUOTE_CHANGED") {
          return {
            handled: true as const,
            text: "El precio, stock o la entrega cambiaron. Voy a actualizar el resumen antes de que lo confirmes.",
          };
        }
        return {
          handled: true as const,
          text: result.reason === "EXPIRED"
            ? "La cotización venció. Voy a preparar un resumen actualizado antes de confirmar."
            : "No pude confirmar el pedido todavía. Revisemos el resumen y volvé a indicarme si lo aceptás.",
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
      const prepared = await deps.prepareDraft({
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        globalTenantId: input.globalTenantId,
        channel: input.channel,
        input: {
          items: input.action.items,
          customer: input.action.customer,
          fulfillment: {
            type: input.action.fulfillment.type,
            branchId: input.action.fulfillment.branchId || null,
          },
          notes: input.action.notes || null,
        },
      });
      return { text: quoteSummary(prepared.quote) };
    },
  };
}

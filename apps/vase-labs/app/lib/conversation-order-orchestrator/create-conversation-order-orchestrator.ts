// Parte de conversation-order-orchestrator.ts: orderFallbackText, mapLocalOrderChannel, buildLocalOrderNumber, buildLocalOrderSnapshot, localOrderText, createConversationOrderOrchestrator.
import { type LabsChannel } from "@vase/contracts";
import { type AiOrderAction } from "../openai-reply-generator";
import { isExplicitOrderConfirmation } from "../conversation-order-draft";
import { publicOrderNumber } from "../local-order-snapshot";
import { OrderOrchestratorDependencies, confirmedOrderText, fulfillmentContext, messageAuthor, quoteSummary, readOrderNumber } from "./quote-summary";

export function orderFallbackText(input: {
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

export function mapLocalOrderChannel(channel: LabsChannel) {
  if (channel === "FACEBOOK") return "MESSENGER";
  return channel;
}

export function buildLocalOrderNumber(conversationId: string) {
  let hash = 2166136261;
  for (const character of conversationId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `LABS-${String((hash >>> 0) % 900000 + 100000)}`;
}

export function buildLocalOrderSnapshot(input: {
  conversationId: string;
  channel: LabsChannel;
  action: Extract<AiOrderAction, { type: "PREPARE" }>;
  fulfillment: {
    type: "DELIVERY" | "PICKUP";
    branchId?: string | null;
    pickupLabel?: string | null;
    address?: string | null;
  };
}) {
  const now = new Date();
  return {
    id: `labs-local:${input.conversationId}`,
    orderNumber: buildLocalOrderNumber(input.conversationId),
    status: "PENDING_REVIEW",
    channel: mapLocalOrderChannel(input.channel),
    currency: "ARS",
    subtotalAmount: 0,
    shippingAmount: 0,
    totalAmount: 0,
    customerName: input.action.customer.name,
    customerPhone: input.action.customer.phone,
    customerEmail: input.action.customer.email ?? null,
    items: input.action.items.map((item) => ({
      productId: item.productId,
      name: item.productId,
      quantity: item.quantity,
    })),
    fulfillment: input.fulfillment,
    source: "vase-labs-local",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function localOrderText(order: unknown) {
  const orderNumber = readOrderNumber({ order });
  return orderNumber
    ? `Tu pedido N.º ${publicOrderNumber(orderNumber)} está en proceso y pendiente de confirmación. Te avisaremos por este mismo medio cuando esté listo.`
    : "Tu pedido está en proceso y pendiente de confirmación. Te avisaremos por este mismo medio cuando esté listo.";
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
      if (deps.createLocalOrder) {
        const order = buildLocalOrderSnapshot({
          conversationId: input.conversationId,
          channel: input.channel,
          action: input.action,
          fulfillment: normalizedFulfillment,
        });
        const createdOrder = await deps.createLocalOrder({
          assistantId: input.assistantId,
          conversationId: input.conversationId,
          globalTenantId: input.globalTenantId,
          channel: input.channel,
          order,
        });
        return { text: localOrderText(createdOrder) };
      }
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

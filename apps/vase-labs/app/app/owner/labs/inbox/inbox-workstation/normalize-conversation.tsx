"use client";

// Parte de inbox-workstation.tsx: InboxMessage, InboxHandoff, InboxConversationItem, InboxInsight, InboxChannelState, RawInboxMessage y más.
import { normalizeInboxChannel, type InboxChannel } from "../inbox-channels";
import { type InboxMessageDelivery } from "../inbox-message-delivery";

export type InboxMessage = {
  id: string;
  role: string;
  direction: "INBOUND" | "OUTBOUND" | null;
  content: string;
  createdAt: string;
  delivery: InboxMessageDelivery | null;
  /** Presupuesto en PDF que la IA mandó con este mensaje. */
  quote?: InboxQuote;
};

export type InboxQuote = {
  id: string;
  number: number;
  currency: string;
  total: number;
  validUntil: string;
  url: string;
  lines: Array<{ name: string; quantity: number; total: number }>;
};

export function readInboxQuote(value: unknown): InboxQuote | undefined {
  const quote = value as Partial<InboxQuote> | null | undefined;
  if (!quote || typeof quote.id !== "string" || typeof quote.number !== "number" || typeof quote.url !== "string") return undefined;
  if (!quote.url.startsWith("https://")) return undefined;
  return {
    id: quote.id,
    number: quote.number,
    currency: typeof quote.currency === "string" ? quote.currency : "ARS",
    total: typeof quote.total === "number" ? quote.total : 0,
    validUntil: typeof quote.validUntil === "string" ? quote.validUntil : "",
    url: quote.url,
    lines: Array.isArray(quote.lines) ? quote.lines.filter((line) => line && typeof line.name === "string") : [],
  };
}

export function formatQuoteNumber(number: number) {
  return String(number).padStart(4, "0");
}

export function formatMoney(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export type InboxHandoff = {
  id: string;
  status: string;
  reason: string;
  priority: string;
  assignedTo: string | null;
};

export type InboxConversationItem = {
  id: string;
  channel: string | null;
  status: string;
  customerName: string | null;
  customerContact: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  escalatedToHuman: boolean;
  summary: string | null;
  messages: InboxMessage[];
  handoffs: InboxHandoff[];
};

/** Lo que el análisis sabe de cada cliente (Conversaciones › Del cliente). */
export type InboxInsight = {
  leadScore: number;
  intentLabel: string;
  currentNeed: string;
  productInterests: string[];
  recommendations: string[];
  nextBestAction: string;
};

export type InboxChannelState = {
  channel: string;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type RawInboxMessage = Partial<Record<keyof InboxMessage, unknown>>;
export type RawInboxHandoff = Partial<Record<keyof InboxHandoff, unknown>>;
export type RawInboxConversation = Partial<Omit<InboxConversationItem, "messages" | "handoffs">> & {
  messages?: unknown;
  handoffs?: unknown;
};

export const inboxTimeZone = "America/Argentina/Buenos_Aires";

export function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", { timeStyle: "short", timeZone: inboxTimeZone }).format(new Date(value));
}

export function dayKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: inboxTimeZone }).format(new Date(value));
}

export function formatDay(value: string) {
  const key = dayKey(value);
  const today = new Date();
  if (key === dayKey(today)) return "Hoy";
  if (key === dayKey(new Date(today.getTime() - 86_400_000))) return "Ayer";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: inboxTimeZone }).format(new Date(value));
}

export function formatQueueTime(value: string | null) {
  if (!value) return "";
  if (dayKey(value) === dayKey(new Date())) return formatTime(value);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: inboxTimeZone }).format(new Date(value));
}

export function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "#";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export const conversationStatusLabels: Record<string, string> = {
  OPEN: "Abierta",
  ESCALATED: "Con humano",
  CLOSED: "Cerrada",
};

export function conversationStatusLabel(status: string) {
  return conversationStatusLabels[status] ?? status;
}

export function resizeDraft(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function messageAuthor(message: Pick<InboxMessage, "role" | "direction">) {
  if (message.role === "human_agent") return "Equipo";
  if (message.direction === "OUTBOUND") return "IA";
  return "Cliente";
}

export function sortConversations(conversations: InboxConversationItem[]) {
  return [...conversations].sort((left, right) =>
    new Date(right.lastMessageAt ?? 0).getTime() - new Date(left.lastMessageAt ?? 0).getTime(),
  );
}

export function stringify(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value?.toString() ?? fallback;
}

export function stringifyNullable(value: unknown) {
  return typeof value === "string" ? value : value?.toString() ?? null;
}

export function normalizeConversation(raw: RawInboxConversation): InboxConversationItem {
  return {
    id: stringify(raw.id),
    channel: stringifyNullable(raw.channel),
    status: stringify(raw.status, "OPEN"),
    customerName: stringifyNullable(raw.customerName),
    customerContact: stringifyNullable(raw.customerContact),
    messageCount: typeof raw.messageCount === "number" ? raw.messageCount : 0,
    lastMessageAt: stringifyNullable(raw.lastMessageAt),
    escalatedToHuman: Boolean(raw.escalatedToHuman),
    summary: stringifyNullable(raw.summary),
    messages: Array.isArray(raw.messages) ? raw.messages.map((message: RawInboxMessage) => {
      const rawDelivery = message.delivery && typeof message.delivery === "object"
        ? message.delivery as Partial<Record<keyof InboxMessageDelivery, unknown>>
        : null;
      const quote = readInboxQuote(message.quote);
      return {
        ...(quote ? { quote } : {}),
        id: stringify(message.id),
        role: stringify(message.role, "customer"),
        direction: message.direction === "INBOUND" || message.direction === "OUTBOUND" ? message.direction : null,
        content: stringify(message.content),
        createdAt: stringify(message.createdAt, new Date().toISOString()),
        delivery: rawDelivery
          ? {
              status: rawDelivery.status === "SENT" || rawDelivery.status === "FAILED"
                ? rawDelivery.status
                : "PENDING",
              providerMessageId: stringifyNullable(rawDelivery.providerMessageId),
              error: stringifyNullable(rawDelivery.error),
            }
          : null,
      };
    }) : [],
    handoffs: Array.isArray(raw.handoffs) ? raw.handoffs.map((handoff: RawInboxHandoff) => ({
      id: stringify(handoff.id),
      status: stringify(handoff.status, "OPEN"),
      reason: stringify(handoff.reason),
      priority: stringify(handoff.priority, "normal"),
      assignedTo: stringifyNullable(handoff.assignedTo),
    })) : [],
  };
}

export const inboxChannelLabels: Record<InboxChannel, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
};

export const inboxChannelTitles: Record<InboxChannel, string> = {
  WHATSAPP: "Chats de WhatsApp",
  INSTAGRAM: "Chats de Instagram",
  FACEBOOK: "Chats de Facebook",
};

export type ChannelFilter = InboxChannel | "ALL";
export type StatusFilter = "todas" | "necesitan" | "ia";

export const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "necesitan", label: "Te necesitan" },
  { id: "ia", label: "Atiende la IA" },
];

export function needsPerson(conversation: Pick<InboxConversationItem, "escalatedToHuman" | "handoffs">) {
  return conversation.escalatedToHuman || conversation.handoffs.length > 0;
}

export function channelOf(conversation: Pick<InboxConversationItem, "channel">): InboxChannel {
  return normalizeInboxChannel(conversation.channel) ?? "WHATSAPP";
}

/** Lo que conviene preguntarle y cómo arrancar cuando la atiende una persona. */
export function personSuggestions(name: string) {
  const first = name.split(/\s+/)[0] || "";
  return {
    ask: ["Para cuándo lo necesita", "Si lo retira o se lo enviamos", "Cómo quiere pagar"],
    replies: [
      `¡Hola${first && first !== "Cliente" ? ` ${first}` : ""}! Soy del equipo, ya te ayudo.`,
      "¿Para cuándo lo necesitás?",
      "¿Lo retirás o te lo enviamos?",
      "¿Querés que te lo reserve?",
    ],
  };
}

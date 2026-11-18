// Cómo sale un mensaje hacia Conversaciones (la página y las rutas que la refrescan lo arman igual).
import { readQuoteMessageMeta, type QuoteMessageMeta } from "./conversation-quote";

type MessageRow = {
  id: string;
  role: string;
  direction: string | null;
  content: string;
  createdAt: Date;
  metadata?: unknown;
  deliveries: Array<{ status: string; providerMessageId: string | null; error: string | null }>;
};

export type InboxMessageView = {
  id: string;
  role: string;
  direction: string | null;
  content: string;
  createdAt: string;
  delivery: { status: string; providerMessageId: string | null; error: string | null } | null;
  quote?: QuoteMessageMeta;
};

export function toInboxMessageView(message: MessageRow): InboxMessageView {
  const quote = message.role === "assistant" ? readQuoteMessageMeta(message.metadata) : null;
  return {
    id: message.id,
    role: message.role,
    direction: message.direction,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    delivery: message.deliveries[0]
      ? {
          status: message.deliveries[0].status,
          providerMessageId: message.deliveries[0].providerMessageId,
          error: message.deliveries[0].error,
        }
      : null,
    ...(quote ? { quote } : {}),
  };
}

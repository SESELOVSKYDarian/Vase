import { inboundChannelMessageSchema, type InboundChannelMessage } from "@vase/contracts";

type MetaMessagingEvent = {
  sender?: { id?: string; name?: string; username?: string };
  recipient?: { id?: string };
  message?: Record<string, unknown>;
};

function getFirstMessagingEvent(payload: unknown): MetaMessagingEvent | null {
  const source = payload as
    | {
        entry?: Array<{
          messaging?: MetaMessagingEvent[];
        }>;
      }
    | undefined;

  return source?.entry?.[0]?.messaging?.[0] ?? null;
}

function getMessageText(rawMessage: Record<string, unknown>) {
  return typeof rawMessage.text === "string" && rawMessage.text.trim() ? rawMessage.text : null;
}

export function parseInstagramWebhookMessage(input: {
  globalTenantId: string;
  payload: unknown;
}): InboundChannelMessage | null {
  const event = getFirstMessagingEvent(input.payload);
  const rawMessage = event?.message;
  const senderId = event?.sender?.id;

  if (!rawMessage || !senderId) {
    return null;
  }

  return inboundChannelMessageSchema.parse({
    globalTenantId: input.globalTenantId,
    channelType: "INSTAGRAM",
    externalThreadKey: senderId,
    externalMessageId: typeof rawMessage.mid === "string" ? rawMessage.mid : null,
    customerName: event.sender?.name || event.sender?.username || null,
    customerContact: senderId,
    text: getMessageText(rawMessage),
    messageType: getMessageText(rawMessage) ? "text" : "unknown",
    provider: "META_OFFICIAL",
    rawPayload: rawMessage,
  });
}

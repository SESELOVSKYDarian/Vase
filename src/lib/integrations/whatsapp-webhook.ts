import type { AiChannelType } from "@prisma/client";
import type { InboundChannelMessage } from "@/lib/integrations/channel-types";

function resolveMessageType(rawMessage: Record<string, unknown>): InboundChannelMessage["messageType"] {
  const rawType = String(rawMessage.type || "").toLowerCase();
  if (rawType === "text") return "text";
  if (rawType === "audio" || rawType === "ptt") return "audio";
  if (rawType === "image") return "image";
  if (rawType === "document") return "document";
  if (rawType === "interactive") return "interactive";
  return "unknown";
}

export function parseWhatsAppWebhookMessage(input: {
  tenantId: string;
  payload: unknown;
  channelType?: AiChannelType;
}): InboundChannelMessage | null {
  const payload = input.payload as
    | {
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<Record<string, unknown>>;
              contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
            };
          }>;
        }>;
      }
    | undefined;

  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const rawMessage = value?.messages?.[0];

  if (!rawMessage) {
    return null;
  }

  const contact = value?.contacts?.[0];
  const messageType = resolveMessageType(rawMessage);
  const text =
    typeof rawMessage.text === "object" && rawMessage.text && "body" in rawMessage.text
      ? String((rawMessage.text as { body?: string }).body || "")
      : typeof rawMessage.body === "string"
        ? rawMessage.body
        : null;

  const mediaId =
    typeof rawMessage.audio === "object" && rawMessage.audio && "id" in rawMessage.audio
      ? String((rawMessage.audio as { id?: string }).id || "")
      : null;

  return {
    tenantId: input.tenantId,
    channelType: input.channelType || "WHATSAPP",
    externalThreadKey: String(rawMessage.from || contact?.wa_id || ""),
    customerName: contact?.profile?.name || null,
    customerContact: String(rawMessage.from || contact?.wa_id || ""),
    text,
    messageType,
    mediaId,
    rawPayload: rawMessage,
  };
}

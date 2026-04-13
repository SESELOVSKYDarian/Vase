import type { AiChannelType } from "@prisma/client";

export type InboundChannelMessage = {
  tenantId: string;
  channelType: AiChannelType;
  externalThreadKey: string;
  customerName?: string | null;
  customerContact?: string | null;
  text?: string | null;
  messageType: "text" | "audio" | "image" | "document" | "interactive" | "unknown";
  mediaId?: string | null;
  rawPayload?: unknown;
};

export type OutboundChannelMessage = {
  to: string;
  text: string;
};

import type { AiChannelType } from "@prisma/client";
import { readWhatsAppProviderConfig, sendOpenWaMessage, sendWhatsAppMessage } from "@/lib/integrations";
import { sendBaileysTextMessage } from "@/server/services/baileys-gateway";

export async function dispatchChannelReply(input: {
  channelType: AiChannelType;
  channelId?: string;
  channelConfig: Record<string, unknown>;
  customerContact: string;
  text: string;
}) {
  if (input.channelType === "WHATSAPP") {
    const providerConfig = readWhatsAppProviderConfig(input.channelConfig);

    if (providerConfig.provider === "OPENWA_UNOFFICIAL") {
      if (!providerConfig.openwaBaseUrl) {
        throw new Error("OpenWA channel is missing base URL");
      }

      await sendOpenWaMessage({
        baseUrl: providerConfig.openwaBaseUrl,
        apiKey: providerConfig.openwaApiKey,
        message: {
          to: input.customerContact,
          text: input.text,
        },
      });

      return { delivered: true };
    }
    if (providerConfig.provider === "BAILEYS_UNOFFICIAL") {
      if (!input.channelId) {
        throw new Error("Baileys channelId is required");
      }
      await sendBaileysTextMessage(input.channelId, input.customerContact, input.text);
      return { delivered: true };
    }

    const accessToken = String(providerConfig.accessToken || "");
    const phoneNumberId = String(providerConfig.phoneNumberId || "");

    if (!accessToken || !phoneNumberId) {
      throw new Error("WhatsApp channel is missing Meta credentials");
    }

    await sendWhatsAppMessage({
      accessToken,
      phoneNumberId,
      message: {
        to: input.customerContact,
        text: input.text,
      },
    });

    return { delivered: true };
  }

  return { delivered: false };
}

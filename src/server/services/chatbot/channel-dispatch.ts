import type { AiChannelType } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/integrations";

export async function dispatchChannelReply(input: {
  channelType: AiChannelType;
  channelConfig: Record<string, unknown>;
  customerContact: string;
  text: string;
}) {
  if (input.channelType === "WHATSAPP") {
    const accessToken = String(input.channelConfig.accessToken || "");
    const phoneNumberId = String(input.channelConfig.phoneNumberId || "");

    if (!accessToken || !phoneNumberId) {
      throw new Error("WhatsApp channel is missing tenant credentials");
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

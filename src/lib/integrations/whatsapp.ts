import type { OutboundChannelMessage } from "@/lib/integrations/channel-types";

export async function sendWhatsAppMessage(input: {
  accessToken: string;
  phoneNumberId: string;
  message: OutboundChannelMessage;
}) {
  const response = await fetch(`https://graph.facebook.com/v17.0/${input.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.message.to,
      text: {
        body: input.message.text,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`WhatsApp send failed: ${details}`);
  }

  return response.json();
}

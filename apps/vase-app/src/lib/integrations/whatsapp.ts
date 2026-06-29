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

export async function sendOpenWaMessage(input: {
  baseUrl: string;
  apiKey?: string;
  message: OutboundChannelMessage;
}) {
  const endpoint = `${input.baseUrl.replace(/\/$/, "")}/sendText`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
    },
    body: JSON.stringify({
      chatId: `${input.message.to}@c.us`,
      text: input.message.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenWA send failed: ${details}`);
  }

  return response.json();
}

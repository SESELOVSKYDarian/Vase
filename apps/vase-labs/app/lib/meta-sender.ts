import type { LabsChannel } from "@vase/contracts";

interface SendMetaTextMessageInput {
  channelType: Extract<LabsChannel, "INSTAGRAM" | "FACEBOOK">;
  pageOrAccountId: string;
  recipientId: string;
  text: string;
  accessToken: string;
  graphVersion?: string;
  fetcher?: typeof fetch;
}

export async function sendMetaTextMessage(input: SendMetaTextMessageInput) {
  const graphVersion = input.graphVersion ?? "v20.0";
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(`https://graph.facebook.com/${graphVersion}/${input.pageOrAccountId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: input.recipientId },
      messaging_type: input.channelType === "FACEBOOK" ? "RESPONSE" : undefined,
      message: { text: input.text },
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      error: typeof payload.error?.message === "string" ? payload.error.message : "META_SEND_FAILED",
    };
  }

  return {
    ok: true,
    providerMessageId: typeof payload.message_id === "string" ? payload.message_id : null,
  };
}

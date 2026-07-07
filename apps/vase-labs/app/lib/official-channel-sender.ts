import type { LabsChannel } from "@vase/contracts";
import { decryptChannelSecret } from "./channel-secrets";

export type OfficialChannelDeliveryContext = {
  channelType: LabsChannel;
  providerAccountId: string;
  encryptedAccessToken: string;
};

export interface OfficialChannelSenderRepository {
  findDeliveryContext(input: {
    globalTenantId: string;
    channelType: LabsChannel;
  }): Promise<OfficialChannelDeliveryContext | null>;
}

export function createOfficialChannelSender(input: {
  repository: OfficialChannelSenderRepository;
  encryptionSecret: string;
  graphVersion: string;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;

  return {
    async send(params: {
      globalTenantId: string;
      channelType: LabsChannel;
      recipientId: string;
      text: string;
    }) {
      const context = await input.repository.findDeliveryContext({
        globalTenantId: params.globalTenantId,
        channelType: params.channelType,
      });
      if (!context) {
        throw new Error("OFFICIAL_CHANNEL_NOT_CONNECTED");
      }

      const accessToken = decryptChannelSecret(
        context.encryptedAccessToken,
        input.encryptionSecret,
      );
      const response = await fetcher(
        `https://graph.facebook.com/${input.graphVersion}/${encodeURIComponent(context.providerAccountId)}/messages`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(
            params.channelType === "WHATSAPP"
              ? {
                  messaging_product: "whatsapp",
                  to: params.recipientId,
                  type: "text",
                  text: { body: params.text },
                }
              : {
                  recipient: { id: params.recipientId },
                  ...(params.channelType === "FACEBOOK"
                    ? { messaging_type: "RESPONSE" }
                    : {}),
                  message: { text: params.text },
                },
          ),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error("META_SEND_FAILED");
      }

      const whatsappMessageId = Array.isArray(payload.messages)
        ? payload.messages[0]?.id
        : null;
      return {
        ok: true as const,
        providerMessageId:
          typeof payload.message_id === "string"
            ? payload.message_id
            : typeof whatsappMessageId === "string"
              ? whatsappMessageId
              : null,
      };
    },
  };
}

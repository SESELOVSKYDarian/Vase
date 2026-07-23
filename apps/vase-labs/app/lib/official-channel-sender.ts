import type { LabsChannel } from "@vase/contracts";
import { decryptChannelSecret } from "./channel-secrets";
import { normalizePublicHttpsImageUrl } from "./public-image-url";

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
      imageUrls?: string[];
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
      const endpoint = `https://graph.facebook.com/${input.graphVersion}/${encodeURIComponent(context.providerAccountId)}/messages`;
      const sendGraphPayload = async (body: unknown) => {
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error("META_SEND_FAILED");
        }

        const whatsappMessageId = Array.isArray(payload.messages)
          ? payload.messages[0]?.id
          : null;
        return typeof payload.message_id === "string"
          ? payload.message_id
          : typeof whatsappMessageId === "string"
            ? whatsappMessageId
            : null;
      };
      const metaEnvelope = {
        recipient: { id: params.recipientId },
        ...(params.channelType === "FACEBOOK"
          ? { messaging_type: "RESPONSE" as const }
          : {}),
      };
      const textProviderMessageId = await sendGraphPayload(
        params.channelType === "WHATSAPP"
          ? {
              messaging_product: "whatsapp",
              to: params.recipientId,
              type: "text",
              text: { body: params.text },
            }
          : {
              ...metaEnvelope,
              message: { text: params.text },
            },
      );
      const imageUrls = [...new Set(
        (params.imageUrls ?? [])
          .map(normalizePublicHttpsImageUrl)
          .filter((url): url is string => Boolean(url)),
      )].slice(0, 3);

      for (const imageUrl of imageUrls) {
        await sendGraphPayload(
          params.channelType === "WHATSAPP"
            ? {
                messaging_product: "whatsapp",
                to: params.recipientId,
                type: "image",
                image: { link: imageUrl },
              }
            : {
                ...metaEnvelope,
                message: {
                  attachment: {
                    type: "image",
                    payload: {
                      url: imageUrl,
                      ...(params.channelType === "FACEBOOK"
                        ? { is_reusable: true }
                        : {}),
                    },
                  },
                },
              },
        );
      }

      return {
        ok: true as const,
        providerMessageId: textProviderMessageId,
      };
    },
  };
}

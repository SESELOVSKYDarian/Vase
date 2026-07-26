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

export class OfficialChannelDeliveryError extends Error {
  constructor(
    public readonly code: string,
    public readonly providerStatus?: number,
    public readonly providerMessage?: string,
  ) {
    super(code);
    this.name = "OfficialChannelDeliveryError";
  }
}

function safeProviderMessage(payload: unknown) {
  const message = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" && message.trim()
    ? message.trim().slice(0, 300)
    : undefined;
}

function isInstagramLoginAccessToken(channelType: LabsChannel, accessToken: string) {
  return channelType === "INSTAGRAM" && accessToken.trim().startsWith("IG");
}

function resolveGraphMessagesEndpoint(input: {
  channelType: LabsChannel;
  graphVersion: string;
  providerAccountId: string;
  accessToken: string;
}) {
  const graphHost = isInstagramLoginAccessToken(input.channelType, input.accessToken)
    ? "https://graph.instagram.com"
    : "https://graph.facebook.com";
  return `${graphHost}/${input.graphVersion}/${encodeURIComponent(input.providerAccountId)}/messages`;
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
        throw new OfficialChannelDeliveryError("OFFICIAL_CHANNEL_NOT_CONNECTED");
      }

      if (!input.encryptionSecret.trim()) {
        throw new OfficialChannelDeliveryError("TOKEN_ENCRYPTION_SECRET_MISSING");
      }
      let accessToken: string;
      try {
        accessToken = decryptChannelSecret(
          context.encryptedAccessToken,
          input.encryptionSecret,
        );
      } catch {
        throw new OfficialChannelDeliveryError("CHANNEL_CREDENTIAL_DECRYPTION_FAILED");
      }
      const endpoint = resolveGraphMessagesEndpoint({
        channelType: params.channelType,
        graphVersion: input.graphVersion,
        providerAccountId: context.providerAccountId,
        accessToken,
      });
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
          throw new OfficialChannelDeliveryError(
            "META_SEND_FAILED",
            response.status,
            safeProviderMessage(payload),
          );
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

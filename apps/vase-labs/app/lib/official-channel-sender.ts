import type { LabsChannel } from "@vase/contracts";
import { decryptChannelSecret } from "./channel-secrets";
import { normalizePublicHttpsImageUrl } from "./public-image-url";
import { resolveMetaGraphHost } from "./meta-channel-auth";

export type OfficialChannelDeliveryContext = {
  channelType: LabsChannel;
  providerAccountId: string;
  encryptedAccessToken: string;
};

export interface OfficialChannelSenderRepository {
  findDeliveryContext(input: {
    globalTenantId: string;
    channelId?: string;
    channelType: LabsChannel;
  }): Promise<OfficialChannelDeliveryContext | null>;
}

export class OfficialChannelDeliveryError extends Error {
  constructor(
    public readonly code: string,
    public readonly providerStatus?: number,
    public readonly providerMessage?: string,
  ) {
    super([
      code,
      providerStatus ? `HTTP ${providerStatus}` : null,
      providerMessage,
    ].filter(Boolean).join(": "));
    this.name = "OfficialChannelDeliveryError";
  }
}

function safeProviderMessage(payload: unknown) {
  const message = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" && message.trim()
    ? message.trim().slice(0, 300)
    : undefined;
}

function safeTransportMessage(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  return message ? message.replace(/\s+/g, " ").slice(0, 200) : undefined;
}

function resolveGraphMessagesEndpoint(input: {
  channelType: LabsChannel;
  graphVersion: string;
  providerAccountId: string;
  accessToken: string;
}) {
  const graphHost = resolveMetaGraphHost(input.channelType, input.accessToken);
  return `${graphHost}/${input.graphVersion}/${encodeURIComponent(input.providerAccountId)}/messages`;
}

export function createOfficialChannelSender(input: {
  repository: OfficialChannelSenderRepository;
  encryptionSecret: string;
  graphVersion: string;
  requestTimeoutMs?: number;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;

  return {
    async send(params: {
      globalTenantId: string;
      channelId?: string;
      channelType: LabsChannel;
      recipientId: string;
      text: string;
      imageUrls?: string[];
      messageTag?: "HUMAN_AGENT";
    }) {
      const context = await input.repository.findDeliveryContext({
        globalTenantId: params.globalTenantId,
        channelId: params.channelId,
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
        let response: Response;
        try {
          response = await fetcher(endpoint, {
            method: "POST",
            signal: AbortSignal.timeout(input.requestTimeoutMs ?? 12_000),
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(body),
          });
        } catch (error) {
          const timedOut = error && typeof error === "object"
            && "name" in error
            && ["AbortError", "TimeoutError"].includes(String((error as { name?: unknown }).name));
          throw new OfficialChannelDeliveryError(
            "META_GRAPH_REQUEST_FAILED",
            undefined,
            timedOut ? "La API de Meta agotó el tiempo de espera." : safeTransportMessage(error),
          );
        }
        const raw = await response.text();
        let payload: unknown = {};
        try { payload = raw ? JSON.parse(raw) : {}; } catch { /* provider returned a non-JSON response */ }

        if (!response.ok) {
          throw new OfficialChannelDeliveryError(
            "META_SEND_FAILED",
            response.status,
            safeProviderMessage(payload) ?? (raw && !raw.includes("<") ? raw.replace(/\s+/g, " ").slice(0, 300) : undefined),
          );
        }

        const providerPayload = payload && typeof payload === "object"
          ? payload as { messages?: Array<{ id?: unknown }>; message_id?: unknown }
          : {};
        const whatsappMessageId = Array.isArray(providerPayload.messages)
          ? providerPayload.messages[0]?.id
          : null;
        const providerMessageId = typeof providerPayload.message_id === "string"
          ? providerPayload.message_id
          : typeof whatsappMessageId === "string"
            ? whatsappMessageId
            : null;
        if (!providerMessageId) {
          throw new OfficialChannelDeliveryError(
            "META_SEND_UNCONFIRMED",
            response.status,
          );
        }
        return providerMessageId;
      };
      const metaEnvelope = {
        recipient: { id: params.recipientId },
        ...(params.channelType === "FACEBOOK"
          ? { messaging_type: "RESPONSE" as const }
          : {}),
        ...(params.channelType === "INSTAGRAM" && params.messageTag
          ? { tag: params.messageTag }
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

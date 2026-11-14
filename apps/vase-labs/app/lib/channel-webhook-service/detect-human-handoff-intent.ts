// Parte de channel-webhook-service.ts: detectHumanHandoffIntent, mergeConversationMetadata, buildMessageMetadata, buildRuntimeEntitlement.
import { createRuntimeEntitlement, type LabsRuntimeEntitlement } from "../billing";
import { EntitlementRow, PersistChannelInboundMessageInput, normalizeEnabledChannels, normalizeRecord } from "./channel-webhook-repository";

export function detectHumanHandoffIntent(text: string | null | undefined) {
  const normalized = text
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!normalized) return false;

  return [
    /\bhablar\s+con\s+(un|una)?\s*(humano|persona|asesor|operador|representante)\b/,
    /\bquiero\s+(un|una)?\s*(humano|persona|asesor|operador|representante)\b/,
    /\bme\s+atiende\s+(un|una)?\s*(humano|persona|asesor|operador|representante)\b/,
    /\batencion\s+humana\b/,
    /\bsoporte\s+humano\b/,
    /\bnecesito\s+(ayuda\s+)?(humana|de\s+una\s+persona|un\s+asesor)\b/,
    /\btalk\s+to\s+(a\s+)?(human|agent|representative|person)\b/,
    /\bspeak\s+to\s+(a\s+)?(human|agent|representative|person)\b/,
    /\bhuman\s+(agent|support)\b/,
  ].some((phrase) => phrase.test(normalized));
}

export function mergeConversationMetadata(metadata: unknown, input: PersistChannelInboundMessageInput) {
  const current = normalizeRecord(metadata) ?? {};
  const context = normalizeRecord(current.context) ?? {};
  const source = input.message.channelType.toLowerCase();

  return {
    ...current,
    state: typeof current.state === "string" ? current.state : "IDLE",
    context: {
      ...context,
      source,
      provider: input.message.provider ?? "META_OFFICIAL",
      channelId: input.context.channel?.id ?? null,
      aiBlockedReason: input.aiBlockedReason,
    },
  };
}

export function buildMessageMetadata(input: PersistChannelInboundMessageInput) {
  return {
    provider: input.message.provider ?? "META_OFFICIAL",
    externalMessageId: input.message.externalMessageId ?? null,
    messageType: input.message.messageType,
    mediaId: input.message.mediaId ?? null,
    aiBlockedReason: input.aiBlockedReason,
    rawPayload: input.message.rawPayload ?? null,
  };
}

export function buildRuntimeEntitlement(row: EntitlementRow | undefined): LabsRuntimeEntitlement | null {
  if (!row) return null;

  return createRuntimeEntitlement({
    globalTenantId: row.globalTenantId,
    plan: row.plan,
    status: row.status,
    enabledChannels: normalizeEnabledChannels(row.enabledChannels),
    tokenPack: row.tokenPack,
    tokensIncluded: row.tokensIncluded,
    tokensUsed: row.tokensUsed,
    extraTokens: row.extraTokens,
    aiBudgetMicros: row.aiBudgetMicros ?? undefined,
    aiBudgetUsedMicros: row.aiBudgetUsedMicros ?? undefined,
    extraAiBudgetMicros: row.extraAiBudgetMicros ?? undefined,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    renewsAt: row.renewsAt?.toISOString() ?? null,
  });
}

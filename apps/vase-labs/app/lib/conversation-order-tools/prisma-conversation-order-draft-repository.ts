// Parte de conversation-order-tools.ts: toStoredDraft, prismaConversationOrderDraftRepository.
import { type LabsChannel } from "@vase/contracts";
import { labsPrisma } from "../db";
import { type ConversationOrderDraftState } from "../conversation-order-draft";
import { DraftRepository, StoredDraft, asJson, readJsonFulfillment, readJsonItems, readJsonObject } from "./confirm-conversation-order-draft";

export function toStoredDraft(draft: {
  id: string;
  assistantId?: string | null;
  state: ConversationOrderDraftState;
  conversationId: string;
  globalTenantId: string;
  channel: LabsChannel | null;
  items: unknown;
  customer: unknown;
  fulfillment: unknown;
  quoteHash: string | null;
  quoteVersion: number | null;
  confirmationCodeHash: string | null;
  confirmationSalt: string | null;
  expiresAt: Date | null;
  idempotencyKey: string;
  lastError?: string | null;
}): StoredDraft {
  return {
    id: draft.id,
    assistantId: draft.assistantId ?? null,
    state: draft.state,
    conversationId: draft.conversationId,
    globalTenantId: draft.globalTenantId,
    channel: draft.channel,
    items: readJsonItems(draft.items),
    customer: readJsonObject(draft.customer),
    fulfillment: readJsonFulfillment(draft.fulfillment),
    quoteHash: draft.quoteHash,
    quoteVersion: draft.quoteVersion,
    confirmationCodeHash: draft.confirmationCodeHash,
    confirmationSalt: draft.confirmationSalt,
    expiresAt: draft.expiresAt,
    idempotencyKey: draft.idempotencyKey,
    notes: null,
  };
}

export const prismaConversationOrderDraftRepository: DraftRepository = {
  async saveDraft(input) {
    const existing = await labsPrisma.conversationOrderDraft.findFirst({
      where: {
        conversationId: input.conversationId,
        state: { in: ["COLLECTING", "QUOTED", "AWAITING_CONFIRMATION"] },
      },
      orderBy: { updatedAt: "desc" },
    });
    const saved = existing
      ? await labsPrisma.conversationOrderDraft.update({
          where: { id: existing.id },
          data: {
            state: input.state,
            revision: { increment: 1 },
            channel: input.channel,
            items: asJson(input.items),
            customer: asJson(input.customer),
            fulfillment: asJson(input.fulfillment),
            quoteSnapshot: asJson(input.quoteSnapshot),
            quoteHash: input.quoteHash,
            quoteVersion: input.quoteVersion,
            confirmationCodeHash: input.confirmationCodeHash,
            confirmationSalt: input.confirmationSalt,
            expiresAt: input.expiresAt,
            idempotencyKey: input.idempotencyKey,
            lastError: null,
          },
        })
      : await labsPrisma.conversationOrderDraft.create({
          data: {
            conversationId: input.conversationId,
            assistantId: input.assistantId,
            globalTenantId: input.globalTenantId,
            state: input.state,
            revision: input.revision,
            channel: input.channel,
            items: asJson(input.items),
            customer: asJson(input.customer),
            fulfillment: asJson(input.fulfillment),
            quoteSnapshot: asJson(input.quoteSnapshot),
            quoteHash: input.quoteHash,
            quoteVersion: input.quoteVersion,
            confirmationCodeHash: input.confirmationCodeHash,
            confirmationSalt: input.confirmationSalt,
            expiresAt: input.expiresAt,
            idempotencyKey: input.idempotencyKey,
          },
        });
    return toStoredDraft(saved);
  },
  async findActiveDraft(conversationId) {
    const draft = await labsPrisma.conversationOrderDraft.findFirst({
      where: {
        conversationId,
        state: { in: ["COLLECTING", "QUOTED", "AWAITING_CONFIRMATION"] },
      },
      orderBy: { updatedAt: "desc" },
    });
    return draft ? toStoredDraft(draft) : null;
  },
  async markConfirmed(input) {
    await labsPrisma.conversationOrderDraft.update({
      where: { id: input.draftId },
      data: {
        state: "CONFIRMED",
        businessOrderId: input.businessOrderId ?? null,
        businessOrderNumber: input.businessOrderNumber ?? null,
        confirmedAt: new Date(),
        lastError: null,
      },
    });
  },
  async markFailed(input) {
    await labsPrisma.conversationOrderDraft.update({
      where: { id: input.draftId },
      data: { lastError: input.reason },
    });
  },
};

import { randomBytes } from "node:crypto";
import type { Prisma } from "../generated/prisma";
import type { LabsOrderCreateRequest, LabsOrderQuoteRequest } from "@vase/contracts";
import type { LabsChannel } from "@vase/contracts";
import { labsPrisma } from "./db";
import {
  buildConfirmationPhrase,
  buildDraftIdempotencyKey,
  createConfirmationCode,
  createConfirmationCodeHash,
  normalizeOrderDraftInput,
  resolveDraftTransition,
  type ConversationOrderDraftState,
} from "./conversation-order-draft";
import { mapLabsChannelToOrderChannel } from "./business-order-client";

type StoredDraft = {
  id: string;
  state: ConversationOrderDraftState;
  conversationId: string;
  globalTenantId: string;
  channel: LabsChannel | null;
  items: Array<{ productId: string; quantity: number }>;
  customer: Record<string, unknown>;
  fulfillment: { type: "DELIVERY" | "PICKUP"; branchId?: string | null };
  quoteHash: string | null;
  quoteVersion: number | null;
  confirmationCodeHash: string | null;
  confirmationSalt: string | null;
  expiresAt: Date | null;
  idempotencyKey: string;
  notes?: string | null;
};

type DraftRepository = {
  saveDraft(input: Omit<StoredDraft, "id"> & { assistantId: string; quoteSnapshot: unknown; revision: number }): Promise<StoredDraft>;
  findActiveDraft(conversationId: string): Promise<StoredDraft | null>;
  markConfirmed(input: { draftId: string; businessOrderId?: string | null; businessOrderNumber?: string | null }): Promise<void>;
  markFailed(input: { draftId: string; reason: string }): Promise<void>;
};

type BusinessClient = {
  quote(input: LabsOrderQuoteRequest): Promise<unknown>;
  create(input: LabsOrderCreateRequest): Promise<unknown>;
};

type ToolDeps = {
  business: BusinessClient;
  repository: DraftRepository;
  now?: () => Date;
  createCode?: () => string;
  createSalt?: () => string;
};

function now(deps: ToolDeps) {
  return deps.now?.() ?? new Date();
}

function salt(deps: ToolDeps) {
  return deps.createSalt?.() ?? randomBytes(16).toString("hex");
}

function readQuote(value: unknown) {
  const source = value as { valid?: unknown; quoteHash?: unknown; quoteVersion?: unknown } | null;
  if (!source || source.valid === false || typeof source.quoteHash !== "string" || typeof source.quoteVersion !== "number") {
    throw new Error("ORDER_QUOTE_INVALID");
  }
  return { quoteHash: source.quoteHash, quoteVersion: source.quoteVersion };
}

function readBusinessOrder(value: unknown) {
  const source = value as { order?: { id?: unknown; orderNumber?: unknown } } | null;
  return {
    id: typeof source?.order?.id === "string" ? source.order.id : null,
    orderNumber: typeof source?.order?.orderNumber === "string" ? source.order.orderNumber : null,
  };
}

export async function prepareConversationOrderDraft(input: {
  assistantId: string;
  conversationId: string;
  globalTenantId: string;
  channel: LabsChannel;
  input: Parameters<typeof normalizeOrderDraftInput>[0];
}, deps: ToolDeps) {
  const normalized = normalizeOrderDraftInput(input.input);
  const businessQuoteInput: LabsOrderQuoteRequest = {
    globalTenantId: input.globalTenantId,
    channel: mapLabsChannelToOrderChannel(input.channel),
    items: normalized.items,
    customer: normalized.customer,
    fulfillment: normalized.fulfillment,
  };
  const quoteSnapshot = await deps.business.quote(businessQuoteInput);
  const quote = readQuote(quoteSnapshot);
  const code = deps.createCode?.() ?? createConfirmationCode();
  const confirmationSalt = salt(deps);
  const revision = 1;
  const expiresAt = new Date(now(deps).getTime() + 30 * 60 * 1000);
  const draft = await deps.repository.saveDraft({
    assistantId: input.assistantId,
    conversationId: input.conversationId,
    globalTenantId: input.globalTenantId,
    channel: input.channel,
    state: "AWAITING_CONFIRMATION",
    revision,
    items: normalized.items,
    customer: normalized.customer,
    fulfillment: normalized.fulfillment,
    quoteSnapshot,
    quoteHash: quote.quoteHash,
    quoteVersion: quote.quoteVersion,
    confirmationCodeHash: createConfirmationCodeHash(code, confirmationSalt),
    confirmationSalt,
    expiresAt,
    idempotencyKey: buildDraftIdempotencyKey(input.conversationId, revision),
    notes: normalized.notes,
  });

  return {
    draft,
    quote: quoteSnapshot,
    confirmationPhrase: buildConfirmationPhrase(code),
    expiresAt,
  };
}

export async function confirmConversationOrderDraft(input: {
  conversationId: string;
  userText: string;
}, deps: ToolDeps) {
  const draft = await deps.repository.findActiveDraft(input.conversationId);
  if (!draft) return { ok: false as const, reason: "DRAFT_NOT_FOUND" as const };
  if (!draft.confirmationCodeHash || !draft.confirmationSalt || !draft.expiresAt) {
    return { ok: false as const, reason: "CONFIRMATION_REQUIRED" as const };
  }

  const latestQuote = readQuote(await deps.business.quote({
    globalTenantId: draft.globalTenantId,
    channel: mapLabsChannelToOrderChannel(draft.channel),
    items: draft.items,
    customer: draft.customer,
    fulfillment: draft.fulfillment,
  }));
  const transition = resolveDraftTransition({
    state: draft.state,
    quoteHash: draft.quoteHash,
    quoteVersion: draft.quoteVersion,
    latestQuoteHash: latestQuote.quoteHash,
    latestQuoteVersion: latestQuote.quoteVersion,
    expiresAt: draft.expiresAt,
    now: now(deps),
    userText: input.userText,
    confirmationCodeHash: draft.confirmationCodeHash,
    salt: draft.confirmationSalt,
  });
  if (!transition.allowed) {
    await deps.repository.markFailed({ draftId: draft.id, reason: transition.reason });
    return { ok: false as const, reason: transition.reason };
  }

  const created = await deps.business.create({
    globalTenantId: draft.globalTenantId,
    idempotencyKey: draft.idempotencyKey,
    channel: mapLabsChannelToOrderChannel(draft.channel),
    items: draft.items,
    customer: draft.customer,
    fulfillment: draft.fulfillment,
    quoteHash: latestQuote.quoteHash,
    quoteVersion: latestQuote.quoteVersion,
    notes: draft.notes,
  });
  const order = readBusinessOrder(created);
  await deps.repository.markConfirmed({
    draftId: draft.id,
    businessOrderId: order.id,
    businessOrderNumber: order.orderNumber,
  });
  return { ok: true as const, order: created };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function readJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readJsonItems(value: unknown): Array<{ productId: string; quantity: number }> {
  return Array.isArray(value)
    ? value
        .map((item) => readJsonObject(item))
        .filter((item) => typeof item.productId === "string")
        .map((item) => ({ productId: String(item.productId), quantity: Math.max(1, Number(item.quantity ?? 1)) }))
    : [];
}

function readJsonFulfillment(value: unknown): { type: "DELIVERY" | "PICKUP"; branchId?: string | null } {
  const source = readJsonObject(value);
  return {
    type: source.type === "PICKUP" ? "PICKUP" : "DELIVERY",
    branchId: typeof source.branchId === "string" ? source.branchId : null,
  };
}

function toStoredDraft(draft: {
  id: string;
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
    notes: draft.lastError ?? null,
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
